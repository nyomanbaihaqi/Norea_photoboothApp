import { net } from 'electron'
import type { DriveStatus, EventData, ReservedLink, SessionRecord } from '@shared/types'
import { parseDriveFolderId } from '@shared/utils'
import { broadcast } from '../broadcast'
import { toView } from '../files'
import { logger } from '../log'
import { getData, saveStore } from '../store'
import { DriveHttpError, generateIds, shareAnyone, uploadFile } from './api'
import { AuthError, isConfigured, isConnected } from './oauth'

const LOOP_MS = 15_000
const MAX_AUTO_ATTEMPTS = 5
const POOL_TARGET = 20

let running = false
let loginBusy = false
let idPool: string[] = []
let timer: NodeJS.Timeout | null = null

export function shareLinkFor(fileId: string, event: EventData | undefined): string {
  const base = getData().settings.webBaseUrl.trim().replace(/\/+$/, '')
  if (!base) return `https://drive.google.com/file/d/${fileId}/view`
  const params = new URLSearchParams({ id: fileId })
  if (event?.name) params.set('e', event.name)
  return `${base}/d/?${params}`
}

export function driveStatus(): DriveStatus {
  const sessions = getData().sessions
  return {
    configured: isConfigured(),
    connected: isConnected(),
    email: getData().settings.google.email,
    pending: sessions.filter((s) => s.uploadStatus === 'pending' || s.uploadStatus === 'uploading')
      .length,
    failed: sessions.filter((s) => s.uploadStatus === 'error').length,
    online: net.isOnline(),
    busy: loginBusy
  }
}

export function setLoginBusy(v: boolean): void {
  loginBusy = v
  emitStatus()
}

export function emitStatus(): void {
  broadcast('drive:updated', driveStatus())
}

function emitSession(s: SessionRecord): void {
  broadcast('session:updated', toView(s))
}

async function fillPool(): Promise<void> {
  if (idPool.length >= 5 || !isConnected() || !net.isOnline()) return
  try {
    idPool.push(...(await generateIds(POOL_TARGET)))
  } catch (err) {
    logger.warn('gagal generate ID Drive', err instanceof Error ? err.message : err)
  }
}

// Pesan ID file Drive di awal supaya link QR sudah ada sebelum upload selesai.
export async function reserveLink(eventId: string): Promise<ReservedLink | null> {
  const event = getData().events.find((e) => e.id === eventId)
  if (!event || !parseDriveFolderId(event.driveFolderUrl) || !isConnected()) return null
  if (idPool.length === 0) await fillPool()
  const fileId = idPool.shift()
  void fillPool()
  if (!fileId) return null
  return { fileId, link: shareLinkFor(fileId, event) }
}

async function uploadOne(s: SessionRecord): Promise<void> {
  const data = getData()
  const event = data.events.find((e) => e.id === s.eventId)
  const folderId = event ? parseDriveFolderId(event.driveFolderUrl) : null
  if (!event || !folderId) {
    s.uploadStatus = 'skipped'
    s.uploadError = 'Event tidak punya folder Drive'
    return
  }
  s.uploadStatus = 'uploading'
  emitSession(s)
  let id: string
  try {
    id = await uploadFile(s.finalPath, folderId, s.driveFileId)
  } catch (err) {
    // 409: file dengan ID ini sudah ada (percobaan sebelumnya sempat sukses)
    if (err instanceof DriveHttpError && err.status === 409 && s.driveFileId) id = s.driveFileId
    else throw err
  }
  await shareAnyone(id)
  s.driveFileId = id
  s.shareLink = shareLinkFor(id, event)
  s.uploadStatus = 'done'
  s.uploadError = undefined
}

export async function processQueue(): Promise<void> {
  if (running || !isConnected() || !net.isOnline()) {
    emitStatus()
    return
  }
  running = true
  try {
    const sessions = getData().sessions.filter(
      (s) =>
        s.uploadStatus === 'pending' ||
        s.uploadStatus === 'uploading' ||
        (s.uploadStatus === 'error' && (s.uploadAttempts ?? 0) < MAX_AUTO_ATTEMPTS)
    )
    for (const s of sessions) {
      if (!net.isOnline()) break
      try {
        await uploadOne(s)
        logger.info('upload selesai', { session: s.id })
      } catch (err) {
        s.uploadAttempts = (s.uploadAttempts ?? 0) + 1
        s.uploadStatus = 'error'
        s.uploadError = err instanceof Error ? err.message : String(err)
        logger.warn('upload gagal', { session: s.id, error: s.uploadError })
        if (err instanceof AuthError) {
          s.uploadStatus = 'pending'
          break
        }
      } finally {
        saveStore()
        emitSession(s)
        emitStatus()
      }
    }
    await fillPool()
  } finally {
    running = false
    emitStatus()
  }
}

export function retryUploads(sessionId?: string): void {
  for (const s of getData().sessions) {
    if (sessionId && s.id !== sessionId) continue
    if (s.uploadStatus === 'error' || (sessionId && s.uploadStatus !== 'uploading')) {
      const event = getData().events.find((e) => e.id === s.eventId)
      if (!event?.driveFolderUrl) continue
      s.uploadStatus = 'pending'
      s.uploadAttempts = 0
    }
  }
  saveStore()
  void processQueue()
}

export function startQueue(): void {
  // Sesi yang ke-stop di tengah upload (app ditutup) diulang
  for (const s of getData().sessions) if (s.uploadStatus === 'uploading') s.uploadStatus = 'pending'
  void processQueue()
  timer = setInterval(() => void processQueue(), LOOP_MS)
}

export function stopQueue(): void {
  if (timer) clearInterval(timer)
}

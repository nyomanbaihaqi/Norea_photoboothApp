import { mkdir, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { EventData, SaveSessionInput, SessionRecord, SessionView } from '@shared/types'
import { sanitizeFileName, uid } from '@shared/utils'
import { fileToNoreaUrl } from './protocol'
import { assetsDir, getData, saveStore } from './store'

export function eventDir(event: EventData): string {
  const name = sanitizeFileName(event.name || 'Tanpa Nama')
  return join(getData().settings.saveDir, `${name}_${event.date}`)
}

function stamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function decodeDataUrl(dataUrl: string): { buf: Buffer; ext: string } {
  const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl)
  if (!m) throw new Error('Format gambar tidak dikenali')
  return { buf: Buffer.from(m[2], 'base64'), ext: m[1] === 'jpeg' ? 'jpg' : m[1] }
}

async function writeImage(path: string, dataUrl: string): Promise<string> {
  const { buf, ext } = decodeDataUrl(dataUrl)
  const full = `${path}.${ext}`
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, buf)
  return full
}

export function toView(s: SessionRecord): SessionView {
  return { ...s, finalUrl: fileToNoreaUrl(s.finalPath) }
}

export async function saveSession(input: SaveSessionInput): Promise<SessionRecord> {
  const data = getData()
  const event = data.events.find((e) => e.id === input.eventId)
  if (!event) throw new Error('Event tidak ditemukan')
  const dir = eventDir(event)
  const id = uid('s_')
  const base = `${stamp()}-${id.slice(-4)}`
  const finalPath = await writeImage(join(dir, 'final', base), input.finalDataUrl)
  const printPath = await writeImage(join(dir, 'print', base), input.printDataUrl)
  const rawPaths: string[] = []
  for (let i = 0; i < input.rawDataUrls.length; i++) {
    rawPaths.push(await writeImage(join(dir, 'raw', `${base}_${i + 1}`), input.rawDataUrls[i]))
  }
  const record: SessionRecord = {
    id,
    eventId: event.id,
    createdAt: Date.now(),
    finalPath,
    printPath,
    rawPaths,
    uploadStatus: event.driveFolderUrl ? 'pending' : 'skipped',
    driveFileId: input.reservedFileId,
    printCount: 0,
    uploadAttempts: 0
  }
  data.sessions.push(record)
  await saveStore(true)
  return record
}

export async function deleteSession(id: string): Promise<void> {
  const data = getData()
  const s = data.sessions.find((x) => x.id === id)
  if (!s) return
  for (const p of [s.finalPath, s.printPath, ...s.rawPaths]) await rm(p, { force: true })
  data.sessions = data.sessions.filter((x) => x.id !== id)
  saveStore()
}

export async function saveAsset(dataUrl: string): Promise<string> {
  const { buf, ext } = decodeDataUrl(dataUrl)
  const name = `${uid('a_')}.${ext}`
  await mkdir(assetsDir(), { recursive: true })
  await writeFile(join(assetsDir(), name), buf)
  return `norea://asset/${name}`
}

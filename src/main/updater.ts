// Auto-update dari GitHub Releases (electron-updater).
// Update di-download di background, lalu dipasang saat aplikasi ditutup
// atau saat operator menekan "Restart & pasang". Tidak pernah restart sendiri
// di tengah event / Mode Tamu.
import { app } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '@shared/types'
import { broadcast } from './broadcast'
import { guestMode } from './ipc'
import { logger } from './log'
import { getData } from './store'

const { autoUpdater } = electronUpdater

const FIRST_CHECK_MS = 30_000
const INTERVAL_MS = 4 * 60 * 60 * 1000

let status: UpdateStatus = { state: 'idle', currentVersion: '' }
let timer: NodeJS.Timeout | null = null

function set(patch: Partial<UpdateStatus>): void {
  status = { ...status, ...patch }
  broadcast('update:status', status)
}

export function updateStatus(): UpdateStatus {
  return status
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/ENOTFOUND|ETIMEDOUT|ECONNRESET|net::ERR/i.test(msg)) return 'Tidak ada koneksi internet'
  if (/404/.test(msg)) return 'Belum ada rilis di GitHub (atau repo private)'
  return msg.split('\n')[0].slice(0, 200)
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) return status
  if (status.state === 'checking' || status.state === 'downloading' || status.state === 'ready') {
    return status
  }
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    set({ state: 'error', error: friendlyError(err), checkedAt: Date.now() })
  }
  return status
}

export function installUpdate(): { ok: true; data: undefined } | { ok: false; error: string } {
  if (status.state !== 'ready') return { ok: false, error: 'Belum ada update yang siap dipasang' }
  if (guestMode) return { ok: false, error: 'Keluar dari Mode Tamu dulu' }
  logger.info(`memasang update ${status.version}`)
  // isSilent=false: tampilkan progres installer, isForceRunAfter=true: buka lagi setelah pasang
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
  return { ok: true, data: undefined }
}

function schedule(): void {
  if (timer) clearInterval(timer)
  timer = null
  if (!getData().settings.autoUpdate) return
  timer = setInterval(() => void checkForUpdates(), INTERVAL_MS)
}

// Dipanggil saat toggle "Update otomatis" diubah di Pengaturan
export function onAutoUpdateSettingChanged(): void {
  autoUpdater.autoDownload = getData().settings.autoUpdate
  schedule()
}

export function startUpdater(): void {
  status = { state: app.isPackaged ? 'idle' : 'disabled', currentVersion: app.getVersion() }
  if (!app.isPackaged) return

  autoUpdater.logger = {
    info: (m: unknown) => logger.info(`[update] ${String(m)}`),
    warn: (m: unknown) => logger.warn(`[update] ${String(m)}`),
    error: (m: unknown) => logger.error(`[update] ${String(m)}`),
    debug: () => undefined
  }
  autoUpdater.autoDownload = getData().settings.autoUpdate
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false

  autoUpdater.on('checking-for-update', () => set({ state: 'checking', error: undefined }))
  autoUpdater.on('update-not-available', () => set({ state: 'none', checkedAt: Date.now() }))
  autoUpdater.on('update-available', (info) => {
    logger.info(`update tersedia: ${info.version}`)
    set({
      state: autoUpdater.autoDownload ? 'downloading' : 'idle',
      version: info.version,
      percent: 0,
      checkedAt: Date.now()
    })
    if (!autoUpdater.autoDownload) void autoUpdater.downloadUpdate().catch(() => undefined)
  })
  autoUpdater.on('download-progress', (p) => set({ state: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`update ${info.version} siap dipasang`)
    set({ state: 'ready', version: info.version, percent: 100 })
  })
  autoUpdater.on('error', (err) => set({ state: 'error', error: friendlyError(err), checkedAt: Date.now() }))

  if (getData().settings.autoUpdate) setTimeout(() => void checkForUpdates(), FIRST_CHECK_MS)
  schedule()
}

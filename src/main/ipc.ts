import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { DEFAULT_SESSION } from '@shared/defaults'
import { LAYOUTS } from '@shared/layouts'
import type {
  EventData,
  FrameTemplate,
  PrinterConfig,
  PrintMode,
  PrintRequest,
  Result,
  SaveSessionInput,
  SettingsPatch
} from '@shared/types'
import { parseDriveFolderId } from '@shared/utils'
import { deleteSession, eventDir, saveAsset, saveSession, toView } from './files'
import { getAccountEmail, getFolder } from './drive/api'
import { isConnected, login, logout } from './drive/oauth'
import {
  driveStatus,
  emitStatus,
  processQueue,
  reserveLink,
  retryUploads,
  setLoginBusy,
  shareLinkFor
} from './drive/queue'
import { logger } from './log'
import { changePin, isValidPinFormat, verifyPin } from './pin'
import { printerManager } from './printer/manager'
import { getData, publicSettings, publicState, saveStore } from './store'
import { checkForUpdates, installUpdate, onAutoUpdateSettingChanged, updateStatus } from './updater'

const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (error: string): Result<never> => ({ ok: false, error })
const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown, min: number, max: number, def: number): number => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
}

function handle<A extends unknown[], R>(
  channel: string,
  fn: (...args: A) => R | Promise<R>
): void {
  ipcMain.handle(channel, async (_e, ...args) => {
    try {
      return await fn(...(args as A))
    } catch (err) {
      logger.error(`ipc ${channel}`, err)
      return fail(err instanceof Error ? err.message : 'Terjadi kesalahan')
    }
  })
}

function cleanEvent(e: EventData): EventData {
  const s = e.session ?? DEFAULT_SESSION
  return {
    id: str(e.id, 64),
    name: str(e.name, 120),
    date: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : new Date().toISOString().slice(0, 10),
    extraInfo: str(e.extraInfo, 200),
    templateId: str(e.templateId, 64),
    driveFolderUrl: str(e.driveFolderUrl, 500).trim(),
    createdAt: num(e.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    session: {
      countdown: num(s.countdown, 1, 30, DEFAULT_SESSION.countdown),
      delayBetween: num(s.delayBetween, 0, 30, DEFAULT_SESSION.delayBetween),
      retakeMode: ['none', 'each', 'all'].includes(s.retakeMode) ? s.retakeMode : 'each',
      mirror: !!s.mirror,
      filter: ['none', 'bw', 'sepia', 'warm', 'cool', 'vivid', 'soft'].includes(s.filter)
        ? s.filter
        : 'none',
      autoPrint: !!s.autoPrint,
      copies: num(s.copies, 0, 10, 1),
      showQr: !!s.showQr,
      flash: !!s.flash,
      sound: !!s.sound,
      resultDuration: num(s.resultDuration, 5, 300, DEFAULT_SESSION.resultDuration)
    }
  }
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  const data = getData

  handle('state:get', () => publicState())

  handle('settings:update', (patch: SettingsPatch) => {
    const s = data().settings
    if (patch.cameraDeviceId !== undefined) s.cameraDeviceId = str(patch.cameraDeviceId, 300)
    if (patch.cameraResolution && ['720p', '1080p', '4k'].includes(patch.cameraResolution)) {
      s.cameraResolution = patch.cameraResolution
    }
    if (patch.printPaperMode === 'layout' || patch.printPaperMode === 'driver') {
      s.printPaperMode = patch.printPaperMode
    }
    if (patch.webBaseUrl !== undefined) {
      const url = str(patch.webBaseUrl, 300).trim().replace(/\/+$/, '')
      if (url && !/^https:\/\//.test(url)) return fail('URL harus diawali https://')
      s.webBaseUrl = url
    }
    if (patch.saveDir) s.saveDir = str(patch.saveDir, 500)
    if (typeof patch.autoUpdate === 'boolean' && patch.autoUpdate !== s.autoUpdate) {
      s.autoUpdate = patch.autoUpdate
      onAutoUpdateSettingChanged()
    }
    saveStore()
    return ok(publicSettings())
  })

  handle('pin:verify', (pin: string) => {
    const r = verifyPin(str(pin, 16))
    return r.ok ? ok({ mustChange: data().settings.pinIsDefault }) : r
  })

  handle('pin:change', (oldPin: string, newPin: string) => {
    if (!isValidPinFormat(newPin)) return fail('PIN harus 4–8 angka')
    const r = verifyPin(str(oldPin, 16))
    if (!r.ok) return r
    if (newPin === '1234') return fail('Jangan pakai PIN default')
    changePin(newPin)
    return ok(undefined)
  })

  handle('events:save', (event: EventData) => {
    const e = cleanEvent(event)
    if (!e.id) return fail('ID event kosong')
    if (!e.name.trim()) return fail('Nama event wajib diisi')
    if (e.driveFolderUrl && !parseDriveFolderId(e.driveFolderUrl)) {
      return fail('Link folder Drive tidak valid')
    }
    const list = data().events
    const idx = list.findIndex((x) => x.id === e.id)
    if (idx >= 0) list[idx] = e
    else list.unshift(e)
    if (!data().settings.activeEventId) data().settings.activeEventId = e.id
    saveStore()
    return ok(list)
  })

  handle('events:delete', (id: string) => {
    const d = data()
    d.events = d.events.filter((e) => e.id !== id)
    if (d.settings.activeEventId === id) d.settings.activeEventId = d.events[0]?.id ?? ''
    saveStore()
    return ok(d.events)
  })

  handle('events:setActive', (id: string) => {
    if (!data().events.some((e) => e.id === id)) return fail('Event tidak ditemukan')
    data().settings.activeEventId = id
    saveStore()
    return ok(publicSettings())
  })

  handle('templates:save', (t: FrameTemplate) => {
    if (!t?.id || t.builtin) return fail('Template bawaan tidak bisa diubah, simpan sebagai baru')
    if (!LAYOUTS.some((l) => l.id === t.layoutId)) return fail('Layout tidak dikenal')
    const clean: FrameTemplate = { ...t, name: str(t.name, 80) || 'Template', updatedAt: Date.now() }
    const list = data().templates
    const idx = list.findIndex((x) => x.id === clean.id)
    if (idx >= 0) list[idx] = clean
    else list.push(clean)
    saveStore()
    return ok(list)
  })

  handle('templates:delete', (id: string) => {
    const d = data()
    const t = d.templates.find((x) => x.id === id)
    if (!t || t.builtin) return fail('Template bawaan tidak bisa dihapus')
    if (d.events.some((e) => e.templateId === id)) return fail('Template masih dipakai event')
    d.templates = d.templates.filter((x) => x.id !== id)
    saveStore()
    return ok(d.templates)
  })

  handle('assets:save', async (dataUrl: string) => {
    if (typeof dataUrl !== 'string' || dataUrl.length > 30_000_000) return fail('Gambar terlalu besar')
    return ok(await saveAsset(dataUrl))
  })

  handle('sessions:save', async (input: SaveSessionInput) => {
    const record = await saveSession(input)
    const event = data().events.find((e) => e.id === record.eventId)
    if (record.driveFileId && event) {
      record.shareLink = shareLinkFor(record.driveFileId, event)
      saveStore()
    }
    void processQueue()
    return ok(toView(record))
  })

  handle('sessions:list', (eventId: string) =>
    data()
      .sessions.filter((s) => s.eventId === eventId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toView)
  )

  handle('sessions:delete', async (id: string) => {
    await deleteSession(str(id, 64))
    emitStatus()
    return ok(undefined)
  })

  handle('sessions:openFolder', async (eventId: string) => {
    const event = data().events.find((e) => e.id === eventId)
    if (!event) return fail('Event tidak ditemukan')
    const dir = eventDir(event)
    await mkdir(dir, { recursive: true })
    const err = await shell.openPath(dir)
    return err ? fail(err) : ok(undefined)
  })

  handle('printer:snapshot', () => printerManager.snapshot())
  handle('printer:refresh', () => printerManager.refresh())
  handle('printer:setConfig', (printers: PrinterConfig[], mode: PrintMode) => {
    if (!Array.isArray(printers)) return fail('Data printer tidak valid')
    printerManager.setConfig(printers, mode)
    return ok(undefined)
  })
  handle('printer:print', (req: PrintRequest) => ok(printerManager.enqueue(req)))
  handle('printer:test', async (name: string) => {
    await printerManager.test(str(name, 300))
    return ok(undefined)
  })
  handle('printer:clearDone', () => printerManager.clearDone())

  handle('drive:status', () => driveStatus())
  handle('drive:setClient', (clientId: string, clientSecret: string) => {
    const g = data().settings.google
    const id = str(clientId, 300).trim()
    const secret = str(clientSecret, 300).trim()
    if (id !== g.clientId || (secret && secret !== g.clientSecret)) logout()
    g.clientId = id
    if (secret) g.clientSecret = secret
    saveStore()
    emitStatus()
    return ok(publicSettings())
  })
  handle('drive:connect', async () => {
    setLoginBusy(true)
    try {
      await login()
      data().settings.google.email = await getAccountEmail()
      saveStore()
      void processQueue()
      return ok(publicSettings())
    } finally {
      setLoginBusy(false)
    }
  })
  handle('drive:disconnect', () => {
    logout()
    emitStatus()
    return ok(publicSettings())
  })
  handle('drive:checkFolder', async (url: string) => {
    const id = parseDriveFolderId(str(url))
    if (!id) return fail('Link folder tidak valid')
    if (!isConnected()) return fail('Hubungkan akun Google dulu di Pengaturan')
    const f = await getFolder(id)
    if (!f.isFolder) return fail('Link ini bukan folder')
    if (!f.canAdd) return fail(`Akun tidak punya izin edit di folder "${f.name}"`)
    return ok({ name: f.name })
  })
  handle('drive:reserve', (eventId: string) => reserveLink(str(eventId, 64)))
  handle('drive:retry', (sessionId?: string) => retryUploads(sessionId))

  handle('update:status', () => updateStatus())
  handle('update:check', () => checkForUpdates())
  handle('update:install', () => installUpdate())

  handle('app:version', () => app.getVersion())
  handle('app:chooseFolder', async (current: string) => {
    const win = getWindow()
    const opts = { defaultPath: str(current), properties: ['openDirectory' as const, 'createDirectory' as const] }
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return r.canceled ? null : r.filePaths[0]
  })
  handle('app:openPath', async (path: string) => {
    const err = await shell.openPath(str(path))
    return err ? fail(err) : ok(undefined)
  })
  handle('app:openLogs', async () => {
    await shell.openPath(join(app.getPath('userData'), 'logs'))
  })
  handle('app:openExternal', async (url: string) => {
    const u = str(url)
    if (!/^https:\/\//.test(u)) return fail('URL tidak diizinkan')
    await shell.openExternal(u)
    return ok(undefined)
  })
  handle('app:setGuestMode', (on: boolean) => {
    const win = getWindow()
    if (!win) return
    guestMode = !!on
    win.setKiosk(guestMode)
    win.setAlwaysOnTop(guestMode, 'screen-saver')
  })
}

export let guestMode = false

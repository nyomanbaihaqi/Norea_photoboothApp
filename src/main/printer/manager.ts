import { BrowserWindow, type WebContents } from 'electron'
import { rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { pathToFileURL } from 'url'
import type {
  PrinterConfig,
  PrinterInfo,
  PrinterSnapshot,
  PrintJob,
  PrintMode,
  PrintRequest
} from '@shared/types'
import { uid } from '@shared/utils'
import { broadcast } from '../broadcast'
import { logger } from '../log'
import { getData, saveStore } from '../store'
import { describeStatus, pickPrinter } from './scheduler'
import { queryWindowsPrinters } from './windows'

const POLL_MS = 4000
const INFLIGHT_MS = 12_000 // lama job dianggap masih "baru dikirim" sebelum muncul di antrian Windows
const MAX_JOBS = 60

interface QueuedJob extends PrintJob {
  path: string
  widthMm: number
  heightMm: number
}

let getWebContents: () => WebContents | null = () => null
let printers: PrinterInfo[] = []
let jobs: QueuedJob[] = []
let lastUsed: string | null = null
const inFlight = new Map<string, number>()
let timer: NodeJS.Timeout | null = null
let polling = false

function snapshot(): PrinterSnapshot {
  return {
    printers,
    jobs: jobs.map(({ path: _p, widthMm: _w, heightMm: _h, ...j }) => j).reverse()
  }
}

function emit(): void {
  broadcast('printer:updated', snapshot())
}

async function refresh(): Promise<void> {
  if (polling) return
  polling = true
  try {
    const wc = getWebContents()
    const electronList = wc ? await wc.getPrintersAsync() : []
    const winList = await queryWindowsPrinters()
    const defaultName = electronList.find((p) => (p as { isDefault?: boolean }).isDefault)?.name
    const config = getData().settings.printers
    printers = electronList.map((p) => {
      const win = winList.find((w) => w.name === p.name)
      const { label, available } = describeStatus(win?.status ?? 0)
      return {
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: p.name === defaultName,
        status: label,
        jobCount: win?.jobCount ?? 0,
        available,
        enabled: config.find((c) => c.name === p.name)?.enabled ?? false,
        inFlight: inFlight.get(p.name) ?? 0
      }
    })
  } catch (err) {
    logger.error('gagal membaca printer', err)
  } finally {
    polling = false
  }
  dispatch()
  emit()
}

function bumpInFlight(name: string, delta: number): void {
  inFlight.set(name, Math.max(0, (inFlight.get(name) ?? 0) + delta))
  const p = printers.find((x) => x.name === name)
  if (p) p.inFlight = inFlight.get(name) ?? 0
}

function dispatch(): void {
  const mode = getData().settings.printMode
  for (const job of jobs.filter((j) => j.status === 'queued')) {
    const candidates = printers.map((p) => ({
      name: p.name,
      enabled: p.enabled,
      available: p.available,
      load: p.jobCount + (inFlight.get(p.name) ?? 0)
    }))
    const target = pickPrinter(candidates, mode, lastUsed)
    if (!target) return // semua printer tidak siap: tunggu polling berikutnya
    lastUsed = target
    job.printer = target
    job.status = 'sending'
    bumpInFlight(target, 1)
    void send(job)
  }
}

async function send(job: QueuedJob): Promise<void> {
  emit()
  try {
    await printImage(job.path, job.printer, job.copies, job.widthMm, job.heightMm)
    job.status = 'sent'
    const s = getData().sessions.find((x) => x.id === job.sessionId)
    if (s) {
      s.printCount += job.copies
      saveStore()
    }
    logger.info(`print terkirim ke ${job.printer}`, { job: job.id })
  } catch (err) {
    job.status = 'error'
    job.error = err instanceof Error ? err.message : String(err)
    logger.error(`print gagal ke ${job.printer}`, err)
  }
  setTimeout(() => {
    bumpInFlight(job.printer, -1)
    emit()
  }, INFLIGHT_MS)
  emit()
}

function pageHtml(body: string, widthMm: number, heightMm: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${widthMm}mm ${heightMm}mm; margin: 0 }
html, body { margin: 0; padding: 0; background: #fff }
.page { width: ${widthMm}mm; height: ${heightMm}mm; overflow: hidden; display: flex; align-items: center; justify-content: center }
.page img { width: 100%; height: 100%; object-fit: contain; display: block }
</style></head><body><div class="page">${body}</div></body></html>`
}

async function printHtml(
  html: string,
  deviceName: string,
  copies: number,
  widthMm: number,
  heightMm: number
): Promise<void> {
  const file = join(tmpdir(), `norea-print-${uid()}.html`)
  await writeFile(file, html, 'utf8')
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await win.loadFile(file)
    const useLayout = getData().settings.printPaperMode === 'layout'
    const landscape = widthMm > heightMm
    const shortMm = Math.min(widthMm, heightMm)
    const longMm = Math.max(widthMm, heightMm)
    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          deviceName,
          copies,
          printBackground: true,
          landscape,
          margins: { marginType: 'none' },
          ...(useLayout
            ? { pageSize: { width: Math.round(shortMm * 1000), height: Math.round(longMm * 1000) } }
            : {})
        },
        (ok, reason) => (ok ? resolve() : reject(new Error(reason || 'Print gagal')))
      )
    })
  } finally {
    win.destroy()
    await rm(file, { force: true })
  }
}

function printImage(
  path: string,
  printer: string,
  copies: number,
  widthMm: number,
  heightMm: number
): Promise<void> {
  const img = `<img src="${pathToFileURL(path).toString()}">`
  return printHtml(pageHtml(img, widthMm, heightMm), printer, copies, widthMm, heightMm)
}

export const printerManager = {
  start(wc: () => WebContents | null): void {
    getWebContents = wc
    void refresh()
    timer = setInterval(() => void refresh(), POLL_MS)
  },
  stop(): void {
    if (timer) clearInterval(timer)
  },
  snapshot,
  async refresh(): Promise<PrinterSnapshot> {
    await refresh()
    return snapshot()
  },
  setConfig(config: PrinterConfig[], mode: PrintMode): void {
    const s = getData().settings
    s.printers = config.map((c) => ({ name: String(c.name), enabled: !!c.enabled }))
    s.printMode = mode === 'round-robin' ? 'round-robin' : 'least-busy'
    saveStore()
    for (const p of printers) p.enabled = s.printers.find((c) => c.name === p.name)?.enabled ?? false
    dispatch()
    emit()
  },
  enqueue(req: PrintRequest): PrintJob {
    const session = getData().sessions.find((s) => s.id === req.sessionId)
    if (!session) throw new Error('Sesi tidak ditemukan')
    const job: QueuedJob = {
      id: uid('j_'),
      sessionId: session.id,
      label: new Date(session.createdAt).toLocaleTimeString('id-ID'),
      printer: '',
      copies: Math.min(Math.max(1, Math.round(req.copies)), 10),
      status: 'queued',
      createdAt: Date.now(),
      path: session.printPath,
      widthMm: req.widthMm,
      heightMm: req.heightMm
    }
    jobs.push(job)
    if (jobs.length > MAX_JOBS) {
      const removable = jobs.findIndex((j) => j.status === 'sent' || j.status === 'error')
      if (removable >= 0) jobs.splice(removable, 1)
    }
    dispatch()
    emit()
    const { path: _p, widthMm: _w, heightMm: _h, ...pub } = job
    return pub
  },
  async test(name: string): Promise<void> {
    const body = `<div style="font-family:sans-serif;text-align:center;border:3mm solid #111;width:100%;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center">
<div style="font-size:14mm;font-weight:700">NOREA</div>
<div style="font-size:5mm;margin-top:4mm">Test print</div>
<div style="font-size:4mm;margin-top:2mm">${name.replace(/[<>&"]/g, '')}</div>
<div style="font-size:3.5mm;margin-top:2mm">${new Date().toLocaleString('id-ID')}</div></div>`
    await printHtml(pageHtml(body, 101.6, 152.4), name, 1, 101.6, 152.4)
  },
  clearDone(): void {
    jobs = jobs.filter((j) => j.status === 'queued' || j.status === 'sending')
    emit()
  }
}

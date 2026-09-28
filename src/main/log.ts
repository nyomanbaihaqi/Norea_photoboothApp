import { app } from 'electron'
import { appendFile, mkdir, rename, stat } from 'fs/promises'
import { join } from 'path'

const MAX_SIZE = 2 * 1024 * 1024

let logDir = ''
let queue: Promise<void> = Promise.resolve()

function logFile(): string {
  if (!logDir) logDir = join(app.getPath('userData'), 'logs')
  return join(logDir, 'main.log')
}

async function write(line: string): Promise<void> {
  const file = logFile()
  await mkdir(logDir, { recursive: true })
  try {
    const s = await stat(file)
    if (s.size > MAX_SIZE) await rename(file, `${file}.1`)
  } catch {
    // file belum ada
  }
  await appendFile(file, line, 'utf8')
}

function log(level: string, msg: string, extra?: unknown): void {
  const detail = extra instanceof Error ? extra.stack ?? extra.message : extra
  const suffix = detail !== undefined ? ' ' + JSON.stringify(detail) : ''
  const line = `${new Date().toISOString()} [${level}] ${msg}${suffix}\n`
  if (!app.isPackaged) process.stdout.write(line)
  queue = queue.then(() => write(line)).catch(() => undefined)
}

export const logger = {
  info: (msg: string, extra?: unknown) => log('INFO', msg, extra),
  warn: (msg: string, extra?: unknown) => log('WARN', msg, extra),
  error: (msg: string, extra?: unknown) => log('ERROR', msg, extra)
}

import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { copyFile, mkdir, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { migrateData } from '@shared/defaults'
import type { AppState, DataFile, PublicSettings } from '@shared/types'
import { logger } from './log'

let data: DataFile
let dataPath = ''
let saveTimer: NodeJS.Timeout | null = null
let writing: Promise<void> = Promise.resolve()

export function defaultSaveDir(): string {
  return join(app.getPath('documents'), 'Norea Photobooth')
}

export function assetsDir(): string {
  return join(app.getPath('userData'), 'assets')
}

export function loadStore(): DataFile {
  dataPath = join(app.getPath('userData'), 'data.json')
  let raw: unknown = null
  for (const file of [dataPath, `${dataPath}.bak`]) {
    if (!existsSync(file)) continue
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'))
      break
    } catch (err) {
      logger.error(`data rusak: ${file}`, err)
    }
  }
  data = migrateData(raw, defaultSaveDir())
  return data
}

export function getData(): DataFile {
  return data
}

async function flush(): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  const tmp = `${dataPath}.tmp`
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  if (existsSync(dataPath)) await copyFile(dataPath, `${dataPath}.bak`).catch(() => undefined)
  await rename(tmp, dataPath)
}

// Simpan dengan debounce. Tulis atomik: tmp → rename.
export function saveStore(immediate = false): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer)
  const run = (): Promise<void> => {
    writing = writing.then(flush).catch((err) => logger.error('gagal simpan data', err))
    return writing
  }
  if (immediate) return run()
  return new Promise((resolve) => {
    saveTimer = setTimeout(() => {
      saveTimer = null
      run().then(resolve)
    }, 300)
  })
}

export function publicSettings(): PublicSettings {
  const { pinHash: _pin, google, ...rest } = data.settings
  return {
    ...rest,
    google: {
      clientId: google.clientId,
      hasSecret: !!google.clientSecret,
      connected: !!google.refreshToken,
      email: google.email
    }
  }
}

export function publicState(): AppState {
  return { settings: publicSettings(), events: data.events, templates: data.templates }
}

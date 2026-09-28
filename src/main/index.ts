import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'path'
import { stopQueue, startQueue } from './drive/queue'
import { guestMode, registerIpc } from './ipc'
import { logger } from './log'
import { ensurePin } from './pin'
import { printerManager } from './printer/manager'
import { registerProtocol, registerSchemes } from './protocol'
import { loadStore, saveStore } from './store'
import { startUpdater } from './updater'

let mainWindow: BrowserWindow | null = null

// Folder data terpisah untuk pengujian, supaya data operator asli tidak tersentuh
if (process.env['NOREA_USER_DATA']) app.setPath('userData', process.env['NOREA_USER_DATA'])

registerSchemes()

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    backgroundColor: '#0f1115',
    title: 'Norea Photobooth App',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  // Mode tamu: jendela tidak boleh ditutup (Alt+F4)
  mainWindow.on('close', (e) => {
    if (guestMode) e.preventDefault()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Link luar dibuka di browser sistem, bukan di dalam aplikasi
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) e.preventDefault()
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  loadStore()
  ensurePin()
  registerProtocol()

  // Izinkan kamera & mikrofon hanya untuk halaman aplikasi sendiri
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(['media', 'fullscreen', 'clipboard-sanitized-write'].includes(permission))
  })
  session.defaultSession.setPermissionCheckHandler((_wc, permission) =>
    ['media', 'fullscreen'].includes(permission)
  )

  registerIpc(() => mainWindow)
  createWindow()
  printerManager.start(() => mainWindow?.webContents ?? null)
  startQueue()
  startUpdater()
  logger.info(`Norea Photobooth ${app.getVersion()} dimulai`)
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  printerManager.stop()
  stopQueue()
  void saveStore(true)
})

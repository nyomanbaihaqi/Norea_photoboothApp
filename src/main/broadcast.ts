import { BrowserWindow } from 'electron'

// Kirim event ke semua window renderer (kecuali window print tersembunyi).
export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.isVisible()) win.webContents.send(channel, payload)
  }
}

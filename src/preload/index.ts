import { contextBridge, ipcRenderer } from 'electron'
import type { Api, Unsubscribe } from '@shared/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invoke = (channel: string, ...args: unknown[]): Promise<any> =>
  ipcRenderer.invoke(channel, ...args)

function on<T>(channel: string, cb: (payload: T) => void): Unsubscribe {
  const listener = (_e: unknown, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: Api = {
  state: { get: () => invoke('state:get') },
  settings: { update: (patch) => invoke('settings:update', patch) },
  pin: {
    verify: (pin) => invoke('pin:verify', pin),
    change: (oldPin, newPin) => invoke('pin:change', oldPin, newPin)
  },
  events: {
    save: (event) => invoke('events:save', event),
    delete: (id) => invoke('events:delete', id),
    setActive: (id) => invoke('events:setActive', id)
  },
  templates: {
    save: (t) => invoke('templates:save', t),
    delete: (id) => invoke('templates:delete', id)
  },
  assets: { save: (dataUrl) => invoke('assets:save', dataUrl) },
  sessions: {
    save: (input) => invoke('sessions:save', input),
    list: (eventId) => invoke('sessions:list', eventId),
    delete: (id) => invoke('sessions:delete', id),
    openFolder: (eventId) => invoke('sessions:openFolder', eventId),
    onUpdated: (cb) => on('session:updated', cb)
  },
  printer: {
    snapshot: () => invoke('printer:snapshot'),
    refresh: () => invoke('printer:refresh'),
    setConfig: (printers, mode) => invoke('printer:setConfig', printers, mode),
    print: (req) => invoke('printer:print', req),
    test: (name) => invoke('printer:test', name),
    clearDone: () => invoke('printer:clearDone'),
    onUpdated: (cb) => on('printer:updated', cb)
  },
  drive: {
    status: () => invoke('drive:status'),
    setClient: (id, secret) => invoke('drive:setClient', id, secret),
    connect: () => invoke('drive:connect'),
    disconnect: () => invoke('drive:disconnect'),
    checkFolder: (url) => invoke('drive:checkFolder', url),
    reserve: (eventId) => invoke('drive:reserve', eventId),
    retry: (sessionId) => invoke('drive:retry', sessionId),
    onUpdated: (cb) => on('drive:updated', cb)
  },
  update: {
    status: () => invoke('update:status'),
    check: () => invoke('update:check'),
    install: () => invoke('update:install'),
    onStatus: (cb) => on('update:status', cb)
  },
  app: {
    version: () => invoke('app:version'),
    chooseFolder: (current) => invoke('app:chooseFolder', current),
    openPath: (path) => invoke('app:openPath', path),
    openLogs: () => invoke('app:openLogs'),
    openExternal: (url) => invoke('app:openExternal', url),
    setGuestMode: (on) => invoke('app:setGuestMode', on)
  }
}

contextBridge.exposeInMainWorld('api', api)

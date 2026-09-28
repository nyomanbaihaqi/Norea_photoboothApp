import { create } from 'zustand'
import type {
  AppState,
  DriveStatus,
  EventData,
  FrameTemplate,
  PrinterSnapshot,
  PublicSettings,
  Result,
  UpdateStatus
} from '@shared/types'

export type Page =
  | 'studio'
  | 'events'
  | 'frames'
  | 'preview'
  | 'printers'
  | 'settings'
  | 'ai'

export interface Toast {
  id: number
  kind: 'ok' | 'error' | 'info'
  text: string
}

interface Store {
  loaded: boolean
  settings: PublicSettings | null
  events: EventData[]
  templates: FrameTemplate[]
  unlocked: boolean
  mustChangePin: boolean
  page: Page
  guest: boolean
  printers: PrinterSnapshot
  drive: DriveStatus | null
  update: UpdateStatus | null
  toasts: Toast[]

  load(): Promise<void>
  setState(s: AppState): void
  setSettings(s: PublicSettings): void
  setEvents(e: EventData[]): void
  setTemplates(t: FrameTemplate[]): void
  unlock(mustChange: boolean): void
  lock(): void
  pinChanged(): void
  go(page: Page): void
  setGuest(on: boolean): Promise<void>
  toast(kind: Toast['kind'], text: string): void
  dismiss(id: number): void
}

let toastId = 0

export const useApp = create<Store>((set, get) => ({
  loaded: false,
  settings: null,
  events: [],
  templates: [],
  unlocked: false,
  mustChangePin: false,
  page: 'studio',
  guest: false,
  printers: { printers: [], jobs: [] },
  drive: null,
  update: null,
  toasts: [],

  async load() {
    const [state, printers, drive, update] = await Promise.all([
      window.api.state.get(),
      window.api.printer.snapshot(),
      window.api.drive.status(),
      window.api.update.status()
    ])
    set({
      loaded: true,
      settings: state.settings,
      events: state.events,
      templates: state.templates,
      printers,
      drive,
      update
    })
    window.api.printer.onUpdated((p) => set({ printers: p }))
    window.api.drive.onUpdated((d) => set({ drive: d }))
    window.api.update.onStatus((u) => set({ update: u }))
  },
  setState: (s) => set({ settings: s.settings, events: s.events, templates: s.templates }),
  setSettings: (settings) => set({ settings }),
  setEvents: (events) => set({ events }),
  setTemplates: (templates) => set({ templates }),
  unlock: (mustChange) => set({ unlocked: true, mustChangePin: mustChange }),
  lock: () => set({ unlocked: false }),
  pinChanged: () => set({ mustChangePin: false }),
  go: (page) => set({ page }),
  async setGuest(on) {
    await window.api.app.setGuestMode(on)
    set({ guest: on })
  },
  toast(kind, text) {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, kind, text }] })
    setTimeout(() => get().dismiss(id), kind === 'error' ? 6000 : 3500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) })
}))

// Helper: tampilkan error dari Result sebagai toast. Kembalikan data kalau ok.
export function unwrap<T>(r: Result<T>, okText?: string): T | undefined {
  const { toast } = useApp.getState()
  if (!r.ok) {
    toast('error', r.error)
    return undefined
  }
  if (okText) toast('ok', okText)
  return r.data
}

export function useActiveEvent(): EventData | undefined {
  return useApp((s) => s.events.find((e) => e.id === s.settings?.activeEventId))
}

export function useTemplate(id: string | undefined): FrameTemplate | undefined {
  return useApp((s) => s.templates.find((t) => t.id === id) ?? s.templates[0])
}

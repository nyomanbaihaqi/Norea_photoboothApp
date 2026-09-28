// Kontrak window.api (diimplementasi di preload, dipakai di renderer).
import type {
  AppState,
  DriveStatus,
  EventData,
  FrameTemplate,
  PrinterConfig,
  PrinterSnapshot,
  PrintJob,
  PrintMode,
  PrintRequest,
  PublicSettings,
  ReservedLink,
  Result,
  SaveSessionInput,
  SessionView,
  SettingsPatch,
  UpdateStatus
} from './types'

export type Unsubscribe = () => void

export interface Api {
  state: {
    get(): Promise<AppState>
  }
  settings: {
    update(patch: SettingsPatch): Promise<Result<PublicSettings>>
  }
  pin: {
    verify(pin: string): Promise<Result<{ mustChange: boolean }>>
    change(oldPin: string, newPin: string): Promise<Result>
  }
  events: {
    save(event: EventData): Promise<Result<EventData[]>>
    delete(id: string): Promise<Result<EventData[]>>
    setActive(id: string): Promise<Result<PublicSettings>>
  }
  templates: {
    save(template: FrameTemplate): Promise<Result<FrameTemplate[]>>
    delete(id: string): Promise<Result<FrameTemplate[]>>
  }
  assets: {
    save(dataUrl: string): Promise<Result<string>>
  }
  sessions: {
    save(input: SaveSessionInput): Promise<Result<SessionView>>
    list(eventId: string): Promise<SessionView[]>
    delete(id: string): Promise<Result>
    openFolder(eventId: string): Promise<Result>
    onUpdated(cb: (s: SessionView) => void): Unsubscribe
  }
  printer: {
    snapshot(): Promise<PrinterSnapshot>
    refresh(): Promise<PrinterSnapshot>
    setConfig(printers: PrinterConfig[], mode: PrintMode): Promise<Result>
    print(req: PrintRequest): Promise<Result<PrintJob>>
    test(name: string): Promise<Result>
    clearDone(): Promise<void>
    onUpdated(cb: (s: PrinterSnapshot) => void): Unsubscribe
  }
  drive: {
    status(): Promise<DriveStatus>
    setClient(clientId: string, clientSecret: string): Promise<Result<PublicSettings>>
    connect(): Promise<Result<PublicSettings>>
    disconnect(): Promise<Result<PublicSettings>>
    checkFolder(url: string): Promise<Result<{ name: string }>>
    reserve(eventId: string): Promise<ReservedLink | null>
    retry(sessionId?: string): Promise<void>
    onUpdated(cb: (s: DriveStatus) => void): Unsubscribe
  }
  update: {
    status(): Promise<UpdateStatus>
    check(): Promise<UpdateStatus>
    install(): Promise<Result>
    onStatus(cb: (s: UpdateStatus) => void): Unsubscribe
  }
  app: {
    version(): Promise<string>
    chooseFolder(current: string): Promise<string | null>
    openPath(path: string): Promise<Result>
    openLogs(): Promise<void>
    openExternal(url: string): Promise<Result>
    setGuestMode(on: boolean): Promise<void>
  }
}

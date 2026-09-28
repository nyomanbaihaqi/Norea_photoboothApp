// Tipe data yang dipakai bareng oleh main process dan renderer.

export type FilterId = 'none' | 'bw' | 'sepia' | 'warm' | 'cool' | 'vivid' | 'soft'
export type RetakeMode = 'none' | 'each' | 'all'

export interface SessionSettings {
  countdown: number // detik sebelum tiap jepretan
  delayBetween: number // jeda antar jepretan (detik)
  retakeMode: RetakeMode
  mirror: boolean
  filter: FilterId
  autoPrint: boolean // true = langsung print, false = konfirmasi dulu
  copies: number
  showQr: boolean // tampilkan QR softcopy di layar hasil
  flash: boolean // efek layar putih saat jepret
  sound: boolean
  resultDuration: number // detik layar hasil sebelum kembali ke awal
}

export interface EventData {
  id: string
  name: string // nama yang dicetak, misal "Rina & Budi"
  date: string // YYYY-MM-DD
  extraInfo: string // info tambahan opsional
  templateId: string
  driveFolderUrl: string
  session: SessionSettings
  createdAt: number
}

export type TextField = 'name' | 'date' | 'extra' | 'custom'

export interface TextElement {
  id: string
  field: TextField
  text: string // dipakai kalau field = custom
  x: number // posisi relatif 0..1 dari lebar kanvas
  y: number // posisi relatif 0..1 dari tinggi kanvas
  fontSize: number // px di resolusi cetak (300 dpi)
  fontFamily: string
  color: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  italic: boolean
  dateFormat?: 'long' | 'short' | 'numeric'
}

export type Decor = 'none' | 'confetti' | 'goldline' | 'dots' | 'hearts' | 'film'

export interface FrameTemplate {
  id: string
  name: string
  layoutId: string
  background: string
  backgroundImage: string // url aset (norea://asset/...) atau ''
  overlayImage: string // PNG transparan di atas foto, atau ''
  decor: Decor
  accent: string // warna aksen untuk dekorasi
  photoRadius: number
  photoBorderWidth: number
  photoBorderColor: string
  texts: TextElement[]
  qr: { enabled: boolean; x: number; y: number; size: number }
  builtin?: boolean
  updatedAt: number
}

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error' | 'skipped'

export interface SessionRecord {
  id: string
  eventId: string
  createdAt: number
  finalPath: string // hasil jadi (softcopy)
  printPath: string // gambar siap cetak (strip digandakan jadi 1 lembar)
  rawPaths: string[]
  uploadStatus: UploadStatus
  uploadError?: string
  driveFileId?: string
  shareLink?: string // link yang dipakai QR
  uploadAttempts?: number
  printCount: number
}

// SessionRecord + URL yang bisa ditampilkan renderer
export interface SessionView extends SessionRecord {
  finalUrl: string
}

export interface PrinterConfig {
  name: string
  enabled: boolean
}

export type PrintMode = 'least-busy' | 'round-robin'

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  email: string
}

export interface AppSettings {
  pinHash: string
  pinIsDefault: boolean
  activeEventId: string
  cameraDeviceId: string
  cameraResolution: '720p' | '1080p' | '4k'
  printers: PrinterConfig[]
  printMode: PrintMode
  printPaperMode: 'layout' | 'driver' // ukuran kertas dari layout atau default driver
  google: GoogleConfig
  webBaseUrl: string // URL web pendamping di Vercel (kamera HP + halaman download)
  saveDir: string
  autoUpdate: boolean // cek & download update otomatis dari GitHub Releases
}

export interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
  status: string // status dari Windows (Normal, Offline, PaperOut, ...)
  jobCount: number // job yang lagi antri di Windows
  available: boolean
  enabled: boolean
  inFlight: number // job dari aplikasi ini yang belum selesai dikirim
}

export type PrintJobStatus = 'queued' | 'sending' | 'sent' | 'error'

export interface PrintJob {
  id: string
  sessionId: string
  label: string
  printer: string // '' kalau belum dapat printer
  copies: number
  status: PrintJobStatus
  error?: string
  createdAt: number
}

export interface PrinterSnapshot {
  printers: PrinterInfo[]
  jobs: PrintJob[]
}

export interface DriveStatus {
  configured: boolean // client id & secret sudah diisi
  connected: boolean
  email: string
  pending: number // jumlah foto yang nunggu di-upload
  failed: number
  online: boolean
  busy: boolean // sedang proses login
}

// Settings yang boleh dilihat renderer: tanpa hash PIN & token Google.
export type PublicSettings = Omit<AppSettings, 'pinHash' | 'google'> & {
  google: { clientId: string; hasSecret: boolean; connected: boolean; email: string }
}

export interface AppState {
  settings: PublicSettings
  events: EventData[]
  templates: FrameTemplate[]
}

// Isi file data.json
export interface DataFile {
  version: number
  settings: AppSettings
  events: EventData[]
  templates: FrameTemplate[]
  sessions: SessionRecord[]
}

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string }

export type SettingsPatch = Partial<
  Pick<
    AppSettings,
    | 'cameraDeviceId'
    | 'cameraResolution'
    | 'printMode'
    | 'printPaperMode'
    | 'webBaseUrl'
    | 'saveDir'
    | 'autoUpdate'
  >
>

export type UpdateState =
  | 'disabled' // mode development / belum dipaketkan
  | 'idle'
  | 'checking'
  | 'none' // sudah versi terbaru
  | 'downloading'
  | 'ready' // siap dipasang
  | 'error'

export interface UpdateStatus {
  state: UpdateState
  currentVersion: string
  version?: string // versi baru
  percent?: number
  error?: string
  checkedAt?: number
}

export interface SaveSessionInput {
  eventId: string
  finalDataUrl: string
  printDataUrl: string
  rawDataUrls: string[]
  reservedFileId?: string // ID Drive yang sudah dipesan (untuk QR di cetakan)
}

export interface PrintRequest {
  sessionId: string
  copies: number
  widthMm: number
  heightMm: number
}

export interface ReservedLink {
  fileId: string
  link: string
}

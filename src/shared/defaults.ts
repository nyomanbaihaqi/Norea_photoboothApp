import type {
  AppSettings,
  DataFile,
  EventData,
  FrameTemplate,
  SessionSettings,
  TextElement
} from './types'
import { todayIso, uid } from './utils'

export const DATA_VERSION = 1
export const DEFAULT_PIN = '1234'

export const FONTS = [
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Cormorant Garamond',
  'Great Vibes',
  'Dancing Script',
  'Pacifico',
  'Bebas Neue'
] as const

export const DEFAULT_SESSION: SessionSettings = {
  countdown: 3,
  delayBetween: 2,
  retakeMode: 'each',
  mirror: true,
  filter: 'none',
  autoPrint: true,
  copies: 1,
  showQr: true,
  flash: true,
  sound: true,
  resultDuration: 20
}

export function defaultSettings(saveDir: string): AppSettings {
  return {
    pinHash: '',
    pinIsDefault: true,
    activeEventId: '',
    cameraDeviceId: '',
    cameraResolution: '1080p',
    printers: [],
    printMode: 'least-busy',
    printPaperMode: 'layout',
    google: { clientId: '', clientSecret: '', refreshToken: '', email: '' },
    webBaseUrl: '',
    saveDir,
    autoUpdate: true
  }
}

function text(
  field: TextElement['field'],
  y: number,
  fontFamily: string,
  fontSize: number,
  color: string,
  extra: Partial<TextElement> = {}
): TextElement {
  return {
    id: `${field}-${y}`,
    field,
    text: '',
    x: 0.5,
    y,
    fontSize,
    fontFamily,
    color,
    align: 'center',
    bold: false,
    italic: false,
    dateFormat: 'long',
    ...extra
  }
}

const NO_QR = { enabled: false, x: 0.85, y: 0.92, size: 0.12 }

export const BUILTIN_TEMPLATES: FrameTemplate[] = [
  {
    id: 'tpl-minimal-white',
    name: 'Minimalis Putih',
    layoutId: 'strip-4',
    background: '#ffffff',
    backgroundImage: '',
    overlayImage: '',
    decor: 'none',
    accent: '#111111',
    photoRadius: 0,
    photoBorderWidth: 0,
    photoBorderColor: '#000000',
    texts: [
      text('name', 0.88, 'Playfair Display', 56, '#111111', { bold: true }),
      text('date', 0.94, 'Montserrat', 26, '#555555')
    ],
    qr: NO_QR,
    builtin: true,
    updatedAt: 0
  },
  {
    id: 'tpl-black-elegant',
    name: 'Hitam Elegan',
    layoutId: '4r-2x2',
    background: '#111111',
    backgroundImage: '',
    overlayImage: '',
    decor: 'goldline',
    accent: '#d4af37',
    photoRadius: 8,
    photoBorderWidth: 0,
    photoBorderColor: '#d4af37',
    texts: [
      text('name', 0.88, 'Great Vibes', 110, '#d4af37'),
      text('date', 0.95, 'Montserrat', 34, '#dddddd')
    ],
    qr: NO_QR,
    builtin: true,
    updatedAt: 0
  },
  {
    id: 'tpl-pastel',
    name: 'Pastel Manis',
    layoutId: '4r-3',
    background: '#fde2e4',
    backgroundImage: '',
    overlayImage: '',
    decor: 'dots',
    accent: '#f9a8d4',
    photoRadius: 24,
    photoBorderWidth: 10,
    photoBorderColor: '#ffffff',
    texts: [
      text('name', 0.82, 'Pacifico', 90, '#7c3aed'),
      text('extra', 0.88, 'Poppins', 34, '#6b21a8'),
      text('date', 0.93, 'Poppins', 34, '#6b21a8')
    ],
    qr: NO_QR,
    builtin: true,
    updatedAt: 0
  },
  {
    id: 'tpl-gold-wedding',
    name: 'Emas Wedding',
    layoutId: '4r-1',
    background: '#fbf7ef',
    backgroundImage: '',
    overlayImage: '',
    decor: 'goldline',
    accent: '#b8923a',
    photoRadius: 0,
    photoBorderWidth: 6,
    photoBorderColor: '#b8923a',
    texts: [
      text('name', 0.87, 'Great Vibes', 130, '#8a6a22'),
      text('date', 0.945, 'Cormorant Garamond', 46, '#8a6a22', { bold: true })
    ],
    qr: NO_QR,
    builtin: true,
    updatedAt: 0
  },
  {
    id: 'tpl-birthday',
    name: 'Ceria Ulang Tahun',
    layoutId: 'strip-3',
    background: '#fff7d6',
    backgroundImage: '',
    overlayImage: '',
    decor: 'confetti',
    accent: '#ef4444',
    photoRadius: 16,
    photoBorderWidth: 0,
    photoBorderColor: '#ffffff',
    texts: [
      text('name', 0.78, 'Bebas Neue', 90, '#ef4444'),
      text('extra', 0.845, 'Poppins', 30, '#374151'),
      text('date', 0.9, 'Poppins', 28, '#374151')
    ],
    qr: NO_QR,
    builtin: true,
    updatedAt: 0
  },
  {
    id: 'tpl-film',
    name: 'Film Strip',
    layoutId: 'strip-4',
    background: '#0b0b0b',
    backgroundImage: '',
    overlayImage: '',
    decor: 'film',
    accent: '#ffffff',
    photoRadius: 0,
    photoBorderWidth: 0,
    photoBorderColor: '#ffffff',
    texts: [
      text('name', 0.89, 'Bebas Neue', 64, '#ffffff'),
      text('date', 0.945, 'Montserrat', 24, '#aaaaaa')
    ],
    qr: NO_QR,
    builtin: true,
    updatedAt: 0
  }
]

export function newEvent(templateId = BUILTIN_TEMPLATES[0].id): EventData {
  return {
    id: uid('ev_'),
    name: '',
    date: todayIso(),
    extraInfo: '',
    templateId,
    driveFolderUrl: '',
    session: { ...DEFAULT_SESSION },
    createdAt: Date.now()
  }
}

export function emptyDataFile(saveDir: string): DataFile {
  return {
    version: DATA_VERSION,
    settings: defaultSettings(saveDir),
    events: [],
    templates: BUILTIN_TEMPLATES.map((t) => ({ ...t })),
    sessions: []
  }
}

// Lengkapi data lama/rusak dengan default. Template bawaan selalu versi terbaru.
export function migrateData(raw: unknown, saveDir: string): DataFile {
  const base = emptyDataFile(saveDir)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<DataFile>
  const settings: AppSettings = {
    ...base.settings,
    ...(r.settings ?? {}),
    google: { ...base.settings.google, ...(r.settings?.google ?? {}) }
  }
  const events = Array.isArray(r.events)
    ? r.events.map((e) => ({ ...newEvent(), ...e, session: { ...DEFAULT_SESSION, ...e.session } }))
    : []
  const custom = Array.isArray(r.templates) ? r.templates.filter((t) => !t.builtin) : []
  return {
    version: DATA_VERSION,
    settings,
    events,
    templates: [...BUILTIN_TEMPLATES.map((t) => ({ ...t })), ...custom],
    sessions: Array.isArray(r.sessions) ? r.sessions : []
  }
}

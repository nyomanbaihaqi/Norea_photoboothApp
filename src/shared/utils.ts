// Fungsi kecil murni (tanpa Electron/DOM) supaya gampang dites.

export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now().toString(36)}${rand}`
}

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

// "2026-09-28" → "28 September 2026" / "28 Sep 2026" / "28.09.2026"
export function formatDateId(iso: string, format: 'long' | 'short' | 'numeric' = 'long'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  const monthIdx = Number(mo) - 1
  if (monthIdx < 0 || monthIdx > 11) return iso
  const day = String(Number(d))
  if (format === 'numeric') return `${d}.${mo}.${y}`
  if (format === 'short') return `${day} ${MONTHS_ID[monthIdx].slice(0, 3)} ${y}`
  return `${day} ${MONTHS_ID[monthIdx]} ${y}`
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Buang karakter yang dilarang di nama file/folder Windows.
export function sanitizeFileName(name: string, fallback = 'event'): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 80)
  if (!cleaned || /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(cleaned)) return fallback
  return cleaned
}

// Ambil ID folder dari link Google Drive (dipakai di Fase 5).
export function parseDriveFolderId(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const byPath = /\/folders\/([a-zA-Z0-9_-]{10,})/.exec(s)
  if (byPath) return byPath[1]
  const byQuery = /[?&]id=([a-zA-Z0-9_-]{10,})/.exec(s)
  if (byQuery) return byQuery[1]
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s
  return null
}

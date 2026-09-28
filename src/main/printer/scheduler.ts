// Logika murni pemilihan printer (tanpa Electron) supaya bisa dites.
import type { PrintMode } from '@shared/types'

export interface Candidate {
  name: string
  enabled: boolean
  available: boolean
  load: number // jobCount Windows + inFlight aplikasi
}

export function pickPrinter(
  printers: Candidate[],
  mode: PrintMode,
  lastUsed: string | null
): string | null {
  const ready = printers.filter((p) => p.enabled && p.available)
  if (ready.length === 0) return null

  if (mode === 'round-robin') {
    const idx = lastUsed ? ready.findIndex((p) => p.name === lastUsed) : -1
    return ready[(idx + 1) % ready.length].name
  }

  // least-busy: beban paling kecil; kalau seri, utamakan yang bukan terakhir dipakai
  let best = ready[0]
  for (const p of ready.slice(1)) {
    if (p.load < best.load || (p.load === best.load && best.name === lastUsed)) best = p
  }
  return best.name
}

// Kode PrinterStatus dari Get-Printer (MSFT_Printer)
const STATUS: Record<number, string> = {
  0: 'Normal',
  1: 'Dijeda',
  2: 'Error',
  3: 'Sedang dihapus',
  4: 'Kertas macet',
  5: 'Kertas habis',
  6: 'Isi kertas manual',
  7: 'Masalah kertas',
  8: 'Offline',
  9: 'Sibuk (I/O)',
  10: 'Sibuk',
  11: 'Mencetak',
  12: 'Tray output penuh',
  13: 'Tidak tersedia',
  14: 'Menunggu',
  15: 'Memproses',
  16: 'Inisialisasi',
  17: 'Pemanasan',
  18: 'Tinta/toner menipis',
  19: 'Tinta/toner habis',
  20: 'Page punt',
  21: 'Butuh tindakan',
  22: 'Memori penuh',
  23: 'Pintu terbuka',
  24: 'Tidak diketahui',
  25: 'Hemat daya'
}

const UNAVAILABLE = new Set([1, 2, 3, 4, 5, 7, 8, 13, 19, 21, 23])

export function describeStatus(code: number): { label: string; available: boolean } {
  return { label: STATUS[code] ?? `Status ${code}`, available: !UNAVAILABLE.has(code) }
}

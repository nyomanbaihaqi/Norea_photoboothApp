import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { DEFAULT_PIN } from '@shared/defaults'
import { getData, saveStore } from './store'

const MAX_TRIES = 5
const LOCK_MS = 30_000

let failed = 0
let lockedUntil = 0

export function hashPin(pin: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(pin, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

function matches(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

export function ensurePin(): void {
  const s = getData().settings
  if (!s.pinHash) {
    s.pinHash = hashPin(DEFAULT_PIN)
    s.pinIsDefault = true
    saveStore()
  }
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4,8}$/.test(pin)
}

export function verifyPin(pin: string): { ok: true } | { ok: false; error: string } {
  const now = Date.now()
  if (now < lockedUntil) {
    const sec = Math.ceil((lockedUntil - now) / 1000)
    return { ok: false, error: `Terlalu banyak salah. Coba lagi dalam ${sec} detik.` }
  }
  if (matches(pin, getData().settings.pinHash)) {
    failed = 0
    return { ok: true }
  }
  failed++
  if (failed >= MAX_TRIES) {
    failed = 0
    lockedUntil = now + LOCK_MS
    return { ok: false, error: 'PIN salah 5x. Tunggu 30 detik.' }
  }
  return { ok: false, error: `PIN salah (${MAX_TRIES - failed} percobaan lagi)` }
}

export function changePin(newPin: string): void {
  const s = getData().settings
  s.pinHash = hashPin(newPin)
  s.pinIsDefault = newPin === DEFAULT_PIN
  saveStore(true)
}

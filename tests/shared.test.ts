import { describe, expect, it } from 'vitest'
import { BUILTIN_TEMPLATES, DEFAULT_SESSION, migrateData } from '@shared/defaults'
import { getLayout, LAYOUTS, printCanvasSize } from '@shared/layouts'
import { formatDateId, parseDriveFolderId, sanitizeFileName } from '@shared/utils'

describe('layouts', () => {
  it.each(LAYOUTS.map((l) => [l.id, l]))('%s: semua slot di dalam kanvas & tidak tumpang tindih', (_, l) => {
    expect(l.slots.length).toBeGreaterThan(0)
    for (const s of l.slots) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.x + s.w).toBeLessThanOrEqual(l.width)
      expect(s.y + s.h).toBeLessThanOrEqual(l.height)
    }
    for (let i = 0; i < l.slots.length; i++) {
      for (let j = i + 1; j < l.slots.length; j++) {
        const a = l.slots[i]
        const b = l.slots[j]
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlap).toBe(false)
      }
    }
  })

  it('rasio kanvas cocok dengan kertas cetak (300 DPI)', () => {
    for (const l of LAYOUTS) {
      const size = printCanvasSize(l)
      const canvasRatio = size.width / size.height
      const paperRatio = l.printWidthMm / l.printHeightMm
      expect(Math.abs(canvasRatio - paperRatio)).toBeLessThan(0.02)
    }
  })

  it('strip digandakan jadi 1 lembar 4R', () => {
    expect(printCanvasSize(getLayout('strip-4'))).toEqual({ width: 1200, height: 1800 })
    expect(printCanvasSize(getLayout('4r-1'))).toEqual({ width: 1200, height: 1800 })
  })

  it('layout tidak dikenal → layout pertama', () => {
    expect(getLayout('xxx').id).toBe(LAYOUTS[0].id)
  })

  it('semua template bawaan memakai layout yang ada', () => {
    for (const t of BUILTIN_TEMPLATES) expect(LAYOUTS.some((l) => l.id === t.layoutId)).toBe(true)
  })
})

describe('formatDateId', () => {
  it('format panjang, pendek, angka', () => {
    expect(formatDateId('2026-09-28')).toBe('28 September 2026')
    expect(formatDateId('2026-01-05', 'short')).toBe('5 Jan 2026')
    expect(formatDateId('2026-01-05', 'numeric')).toBe('05.01.2026')
  })
  it('input tidak valid dikembalikan apa adanya', () => {
    expect(formatDateId('kemarin')).toBe('kemarin')
    expect(formatDateId('2026-13-01')).toBe('2026-13-01')
  })
})

describe('sanitizeFileName', () => {
  it('membuang karakter terlarang Windows', () => {
    expect(sanitizeFileName('Rina & Budi: "Wedding" <2026>?')).toBe('Rina & Budi Wedding 2026')
    expect(sanitizeFileName('a/b\\c|d*e')).toBe('abcde')
  })
  it('nama kosong atau reserved → fallback', () => {
    expect(sanitizeFileName('   ')).toBe('event')
    expect(sanitizeFileName('CON')).toBe('event')
    expect(sanitizeFileName('...')).toBe('event')
  })
  it('titik/spasi di akhir dibuang', () => {
    expect(sanitizeFileName('Acara. ')).toBe('Acara')
  })
})

describe('parseDriveFolderId', () => {
  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345'
  it.each([
    `https://drive.google.com/drive/folders/${id}`,
    `https://drive.google.com/drive/folders/${id}?usp=sharing`,
    `https://drive.google.com/drive/u/1/folders/${id}`,
    `https://drive.google.com/open?id=${id}`,
    id
  ])('%s', (url) => {
    expect(parseDriveFolderId(url)).toBe(id)
  })
  it('link salah → null', () => {
    expect(parseDriveFolderId('')).toBeNull()
    expect(parseDriveFolderId('https://google.com')).toBeNull()
  })
})

describe('migrateData', () => {
  it('data kosong/rusak → default', () => {
    const d = migrateData(null, 'C:/foto')
    expect(d.settings.saveDir).toBe('C:/foto')
    expect(d.templates).toHaveLength(BUILTIN_TEMPLATES.length)
    expect(migrateData('rusak', 'x').events).toEqual([])
  })

  it('melengkapi field baru & mempertahankan template custom', () => {
    const d = migrateData(
      {
        settings: { webBaseUrl: 'https://x.vercel.app', google: { clientId: 'abc' } },
        events: [{ id: 'e1', name: 'A', session: { countdown: 5 } }],
        templates: [{ ...BUILTIN_TEMPLATES[0], id: 'custom1', builtin: false }, { ...BUILTIN_TEMPLATES[0], name: 'lama' }],
        sessions: []
      },
      'C:/foto'
    )
    expect(d.settings.webBaseUrl).toBe('https://x.vercel.app')
    expect(d.settings.google.clientId).toBe('abc')
    expect(d.settings.google.refreshToken).toBe('')
    expect(d.settings.printMode).toBe('least-busy')
    expect(d.events[0].session.countdown).toBe(5)
    expect(d.events[0].session.copies).toBe(DEFAULT_SESSION.copies)
    expect(d.templates.map((t) => t.id)).toContain('custom1')
    expect(d.templates.find((t) => t.id === BUILTIN_TEMPLATES[0].id)?.name).toBe(BUILTIN_TEMPLATES[0].name)
  })
})

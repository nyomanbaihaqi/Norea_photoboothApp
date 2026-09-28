import { describe, expect, it } from 'vitest'
import { describeStatus, pickPrinter, type Candidate } from '../src/main/printer/scheduler'

const p = (name: string, load = 0, extra: Partial<Candidate> = {}): Candidate => ({
  name,
  load,
  enabled: true,
  available: true,
  ...extra
})

describe('pickPrinter · least-busy', () => {
  it('memilih printer dengan beban paling kecil', () => {
    expect(pickPrinter([p('A', 2), p('B', 0), p('C', 1)], 'least-busy', null)).toBe('B')
  })

  it('kalau seri, hindari printer yang terakhir dipakai', () => {
    expect(pickPrinter([p('A', 0), p('B', 0)], 'least-busy', 'A')).toBe('B')
    expect(pickPrinter([p('A', 0), p('B', 0)], 'least-busy', 'B')).toBe('A')
  })

  it('melewati printer nonaktif atau bermasalah', () => {
    const list = [p('A', 0, { enabled: false }), p('B', 0, { available: false }), p('C', 5)]
    expect(pickPrinter(list, 'least-busy', null)).toBe('C')
  })

  it('mengembalikan null kalau tidak ada printer siap', () => {
    expect(pickPrinter([p('A', 0, { available: false })], 'least-busy', null)).toBeNull()
    expect(pickPrinter([], 'least-busy', null)).toBeNull()
  })

  it('membagi rata job beruntun (simulasi beban bertambah)', () => {
    const list = [p('A'), p('B'), p('C')]
    const used: string[] = []
    let last: string | null = null
    for (let i = 0; i < 6; i++) {
      last = pickPrinter(list, 'least-busy', last)!
      used.push(last)
      list.find((x) => x.name === last)!.load++
    }
    expect(used.filter((n) => n === 'A')).toHaveLength(2)
    expect(used.filter((n) => n === 'B')).toHaveLength(2)
    expect(used.filter((n) => n === 'C')).toHaveLength(2)
  })
})

describe('pickPrinter · round-robin', () => {
  it('bergiliran A → B → C → A', () => {
    const list = [p('A', 9), p('B'), p('C')]
    expect(pickPrinter(list, 'round-robin', null)).toBe('A')
    expect(pickPrinter(list, 'round-robin', 'A')).toBe('B')
    expect(pickPrinter(list, 'round-robin', 'B')).toBe('C')
    expect(pickPrinter(list, 'round-robin', 'C')).toBe('A')
  })

  it('melewati printer bermasalah', () => {
    const list = [p('A'), p('B', 0, { available: false }), p('C')]
    expect(pickPrinter(list, 'round-robin', 'A')).toBe('C')
  })
})

describe('describeStatus', () => {
  it('Normal tersedia, Offline & kertas habis tidak', () => {
    expect(describeStatus(0)).toEqual({ label: 'Normal', available: true })
    expect(describeStatus(8).available).toBe(false)
    expect(describeStatus(5).available).toBe(false)
    expect(describeStatus(11).available).toBe(true) // sedang mencetak tetap boleh antri
  })
})

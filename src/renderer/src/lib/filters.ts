import type { FilterId } from '@shared/types'

export const FILTERS: { id: FilterId; name: string; css: string }[] = [
  { id: 'none', name: 'Normal', css: 'none' },
  { id: 'bw', name: 'Hitam Putih', css: 'grayscale(1) contrast(1.1)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(0.8) contrast(1.05)' },
  { id: 'warm', name: 'Hangat', css: 'sepia(0.25) saturate(1.25) hue-rotate(-8deg)' },
  { id: 'cool', name: 'Dingin', css: 'saturate(0.9) hue-rotate(12deg) brightness(1.03)' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.5) contrast(1.1)' },
  { id: 'soft', name: 'Soft', css: 'contrast(0.9) brightness(1.08) saturate(0.9)' }
]

export function filterCss(id: FilterId): string {
  return FILTERS.find((f) => f.id === id)?.css ?? 'none'
}

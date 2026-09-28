// Definisi layout / ukuran cetak. Semua ukuran dalam piksel di 300 DPI.

export interface Slot {
  x: number
  y: number
  w: number
  h: number
}

export interface Layout {
  id: string
  name: string
  paper: string // label kertas untuk UI
  width: number
  height: number
  slots: Slot[]
  // Ukuran kertas cetak (mm). Strip dicetak 2 berdampingan di 1 lembar 4R.
  printWidthMm: number
  printHeightMm: number
  duplicateForPrint: boolean
}

const R4_W = 101.6
const R4_H = 152.4
const R5_W = 127
const R5_H = 177.8

export const LAYOUTS: Layout[] = [
  {
    id: '4r-1',
    name: '4R Portrait · 1 foto',
    paper: '4R (4x6 in)',
    width: 1200,
    height: 1800,
    slots: [{ x: 60, y: 60, w: 1080, h: 1380 }],
    printWidthMm: R4_W,
    printHeightMm: R4_H,
    duplicateForPrint: false
  },
  {
    id: '4r-2x2',
    name: '4R Portrait · grid 2x2',
    paper: '4R (4x6 in)',
    width: 1200,
    height: 1800,
    slots: [
      { x: 50, y: 50, w: 535, h: 700 },
      { x: 615, y: 50, w: 535, h: 700 },
      { x: 50, y: 780, w: 535, h: 700 },
      { x: 615, y: 780, w: 535, h: 700 }
    ],
    printWidthMm: R4_W,
    printHeightMm: R4_H,
    duplicateForPrint: false
  },
  {
    id: '4r-3',
    name: '4R Portrait · 1 besar + 2 kecil',
    paper: '4R (4x6 in)',
    width: 1200,
    height: 1800,
    slots: [
      { x: 50, y: 50, w: 1100, h: 720 },
      { x: 50, y: 800, w: 535, h: 535 },
      { x: 615, y: 800, w: 535, h: 535 }
    ],
    printWidthMm: R4_W,
    printHeightMm: R4_H,
    duplicateForPrint: false
  },
  {
    id: '4r-l1',
    name: '4R Landscape · 1 foto',
    paper: '4R (6x4 in)',
    width: 1800,
    height: 1200,
    slots: [{ x: 60, y: 60, w: 1680, h: 920 }],
    printWidthMm: R4_H,
    printHeightMm: R4_W,
    duplicateForPrint: false
  },
  {
    id: '4r-l3',
    name: '4R Landscape · 1 besar + 2 kecil',
    paper: '4R (6x4 in)',
    width: 1800,
    height: 1200,
    slots: [
      { x: 50, y: 50, w: 1100, h: 825 },
      { x: 1180, y: 50, w: 570, h: 400 },
      { x: 1180, y: 475, w: 570, h: 400 }
    ],
    printWidthMm: R4_H,
    printHeightMm: R4_W,
    duplicateForPrint: false
  },
  {
    id: 'strip-3',
    name: 'Strip 2x6 · 3 foto',
    paper: '2 strip di 1 lembar 4R',
    width: 600,
    height: 1800,
    slots: [
      { x: 40, y: 40, w: 520, h: 390 },
      { x: 40, y: 460, w: 520, h: 390 },
      { x: 40, y: 880, w: 520, h: 390 }
    ],
    printWidthMm: R4_W,
    printHeightMm: R4_H,
    duplicateForPrint: true
  },
  {
    id: 'strip-4',
    name: 'Strip 2x6 · 4 foto',
    paper: '2 strip di 1 lembar 4R',
    width: 600,
    height: 1800,
    slots: [
      { x: 40, y: 40, w: 520, h: 340 },
      { x: 40, y: 405, w: 520, h: 340 },
      { x: 40, y: 770, w: 520, h: 340 },
      { x: 40, y: 1135, w: 520, h: 340 }
    ],
    printWidthMm: R4_W,
    printHeightMm: R4_H,
    duplicateForPrint: true
  },
  {
    id: '5r-1',
    name: '5R Portrait · 1 foto',
    paper: '5R (5x7 in)',
    width: 1500,
    height: 2100,
    slots: [{ x: 70, y: 70, w: 1360, h: 1640 }],
    printWidthMm: R5_W,
    printHeightMm: R5_H,
    duplicateForPrint: false
  },
  {
    id: '5r-2x2',
    name: '5R Portrait · grid 2x2',
    paper: '5R (5x7 in)',
    width: 1500,
    height: 2100,
    slots: [
      { x: 60, y: 60, w: 670, h: 870 },
      { x: 770, y: 60, w: 670, h: 870 },
      { x: 60, y: 970, w: 670, h: 870 },
      { x: 770, y: 970, w: 670, h: 870 }
    ],
    printWidthMm: R5_W,
    printHeightMm: R5_H,
    duplicateForPrint: false
  }
]

export function getLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]
}

// Ukuran kanvas file cetak (strip digandakan berdampingan).
export function printCanvasSize(layout: Layout): { width: number; height: number } {
  return layout.duplicateForPrint
    ? { width: layout.width * 2, height: layout.height }
    : { width: layout.width, height: layout.height }
}

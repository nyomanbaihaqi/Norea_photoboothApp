// Satu-satunya mesin render gambar. Dipakai sesi foto, Frame Generator, dan Preview
// supaya hasil preview = hasil cetak.
import { getLayout, printCanvasSize, type Layout } from '@shared/layouts'
import type { EventData, FilterId, FrameTemplate, TextElement } from '@shared/types'
import { formatDateId } from '@shared/utils'
import { filterCss } from './filters'
import { ensureFonts, fontSpec } from './fonts'
import { drawCover, makeCanvas, roundRectPath, tryLoadImage } from './images'
import { qrCanvas } from './qr'

type Source = CanvasImageSource & { width: number; height: number }

export interface ComposeInput {
  template: FrameTemplate
  event: Pick<EventData, 'name' | 'date' | 'extraInfo'>
  photos: Source[]
  filter: FilterId
  qrUrl?: string | null
}

export function resolveText(t: TextElement, event: ComposeInput['event']): string {
  switch (t.field) {
    case 'name':
      return event.name
    case 'date':
      return formatDateId(event.date, t.dateFormat ?? 'long')
    case 'extra':
      return event.extraInfo
    default:
      return t.text
  }
}

function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.3)
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3)
  ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s)
  ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3)
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3)
  ctx.fill()
}

function drawDecorBack(ctx: CanvasRenderingContext2D, t: FrameTemplate, L: Layout): void {
  const { width: W, height: H } = L
  const rand = seeded(W * 7 + H)
  ctx.save()
  switch (t.decor) {
    case 'dots': {
      ctx.fillStyle = t.accent
      ctx.globalAlpha = 0.35
      const step = Math.round(W / 14)
      for (let y = step / 2; y < H; y += step) {
        for (let x = ((y / step) % 2) * (step / 2) + step / 4; x < W; x += step) {
          ctx.beginPath()
          ctx.arc(x, y, step * 0.14, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'confetti': {
      const colors = [t.accent, '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899']
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = colors[i % colors.length]
        ctx.globalAlpha = 0.85
        ctx.save()
        ctx.translate(rand() * W, rand() * H)
        ctx.rotate(rand() * Math.PI)
        const s = 8 + rand() * 14
        if (i % 3 === 0) {
          ctx.beginPath()
          ctx.arc(0, 0, s / 2, 0, Math.PI * 2)
          ctx.fill()
        } else ctx.fillRect(-s / 2, -s / 4, s, s / 2)
        ctx.restore()
      }
      break
    }
    case 'hearts': {
      ctx.fillStyle = t.accent
      ctx.globalAlpha = 0.35
      for (let i = 0; i < 50; i++) drawHeart(ctx, rand() * W, rand() * H, 20 + rand() * 30)
      break
    }
    case 'film': {
      ctx.fillStyle = '#e5e5e5'
      const hole = Math.max(12, Math.round(W * 0.027))
      for (let y = 20; y < H - hole; y += hole * 3) {
        ctx.beginPath()
        ctx.roundRect(W * 0.02, y, hole, hole * 1.6, 3)
        ctx.roundRect(W - W * 0.02 - hole, y, hole, hole * 1.6, 3)
        ctx.fill()
      }
      break
    }
  }
  ctx.restore()
}

function drawDecorFront(ctx: CanvasRenderingContext2D, t: FrameTemplate, L: Layout): void {
  if (t.decor !== 'goldline') return
  const { width: W, height: H } = L
  const unit = Math.min(W, H) / 100
  ctx.save()
  ctx.strokeStyle = t.accent
  ctx.lineWidth = unit * 0.5
  ctx.strokeRect(unit * 1.5, unit * 1.5, W - unit * 3, H - unit * 3)
  ctx.lineWidth = unit * 0.2
  ctx.strokeRect(unit * 2.6, unit * 2.6, W - unit * 5.2, H - unit * 5.2)
  ctx.restore()
}

function drawSlotPlaceholder(ctx: CanvasRenderingContext2D, i: number, s: Layout['slots'][0]): void {
  ctx.fillStyle = '#374151'
  ctx.fillRect(s.x, s.y, s.w, s.h)
  ctx.fillStyle = '#9ca3af'
  ctx.font = `600 ${Math.round(s.h / 6)}px Poppins, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`FOTO ${i + 1}`, s.x + s.w / 2, s.y + s.h / 2)
}

export async function composeFinal(input: ComposeInput): Promise<HTMLCanvasElement> {
  const { template: t, event, photos, filter } = input
  const L = getLayout(t.layoutId)
  await ensureFonts(t.texts)
  const [bgImg, overlayImg] = await Promise.all([
    tryLoadImage(t.backgroundImage),
    tryLoadImage(t.overlayImage)
  ])

  const c = makeCanvas(L.width, L.height)
  const ctx = c.getContext('2d')!

  // 1. Background
  ctx.fillStyle = t.background || '#ffffff'
  ctx.fillRect(0, 0, L.width, L.height)
  if (bgImg) drawCover(ctx, bgImg, 0, 0, L.width, L.height)
  drawDecorBack(ctx, t, L)

  // 2. Foto
  L.slots.forEach((s, i) => {
    const photo = photos[i]
    ctx.save()
    roundRectPath(ctx, s.x, s.y, s.w, s.h, t.photoRadius)
    ctx.clip()
    if (photo) {
      ctx.filter = filterCss(filter)
      drawCover(ctx, photo, s.x, s.y, s.w, s.h)
      ctx.filter = 'none'
    } else drawSlotPlaceholder(ctx, i, s)
    ctx.restore()
    if (t.photoBorderWidth > 0) {
      ctx.save()
      ctx.strokeStyle = t.photoBorderColor
      ctx.lineWidth = t.photoBorderWidth
      roundRectPath(ctx, s.x, s.y, s.w, s.h, t.photoRadius)
      ctx.stroke()
      ctx.restore()
    }
  })

  // 3. Overlay PNG desain sendiri
  if (overlayImg) ctx.drawImage(overlayImg, 0, 0, L.width, L.height)
  drawDecorFront(ctx, t, L)

  // 4. Teks
  for (const tx of t.texts) {
    const value = resolveText(tx, event)
    if (!value) continue
    ctx.save()
    ctx.font = fontSpec(tx, tx.fontSize)
    ctx.fillStyle = tx.color
    ctx.textAlign = tx.align
    ctx.textBaseline = 'middle'
    ctx.fillText(value, tx.x * L.width, tx.y * L.height, L.width * 0.95)
    ctx.restore()
  }

  // 5. QR (kalau aktif dan link tersedia)
  if (t.qr.enabled && input.qrUrl) {
    const size = t.qr.size * L.width
    const qr = await qrCanvas(input.qrUrl, size)
    ctx.drawImage(qr, t.qr.x * L.width - size / 2, t.qr.y * L.height - size / 2, size, size)
  }
  return c
}

// File cetak: strip digandakan berdampingan di 1 lembar 4R.
export function composePrint(finalCanvas: HTMLCanvasElement, layoutId: string): HTMLCanvasElement {
  const L = getLayout(layoutId)
  if (!L.duplicateForPrint) return finalCanvas
  const size = printCanvasSize(L)
  const c = makeCanvas(size.width, size.height)
  const ctx = c.getContext('2d')!
  ctx.drawImage(finalCanvas, 0, 0)
  ctx.drawImage(finalCanvas, L.width, 0)
  return c
}

// Panduan ukuran untuk desainer (Canva/Photoshop): slot foto dibuat transparan.
export function layoutGuide(layoutId: string): HTMLCanvasElement {
  const L = getLayout(layoutId)
  const c = makeCanvas(L.width, L.height)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, L.width, L.height)
  L.slots.forEach((s, i) => {
    ctx.clearRect(s.x, s.y, s.w, s.h)
    ctx.setLineDash([16, 10])
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.strokeRect(s.x, s.y, s.w, s.h)
    ctx.fillStyle = '#ef4444'
    ctx.font = '600 28px Poppins, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`FOTO ${i + 1} · ${s.w}x${s.h}px`, s.x + s.w / 2, s.y + s.h / 2)
  })
  ctx.fillStyle = '#111'
  ctx.font = '600 26px Poppins, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${L.name} · ${L.width}x${L.height}px · 300 DPI`, L.width / 2, L.height - 30)
  return c
}

// Utilitas gambar di renderer.

export type Photo = HTMLCanvasElement

const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!src) return Promise.reject(new Error('src kosong'))
  let p = cache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => {
        cache.delete(src)
        reject(new Error(`Gagal memuat gambar ${src}`))
      }
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}

export async function tryLoadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null
  try {
    return await loadImage(src)
  } catch {
    return null
  }
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.round(w)
  c.height = Math.round(h)
  return c
}

// Gambar sumber ke area tujuan dengan mode "cover" (crop tengah).
export function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const sw = src.width
  const sh = src.height
  const scale = Math.max(w / sw, h / sh)
  const cw = w / scale
  const ch = h / scale
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h)
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath()
  if (r > 0) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

// Foto contoh (gradasi + siluet) untuk Frame Generator & Preview.
const sampleCache: Photo[] = []

export function samplePhotos(count: number): Photo[] {
  while (sampleCache.length < count) sampleCache.push(makeSample(sampleCache.length))
  return sampleCache.slice(0, count)
}

function makeSample(i: number): Photo {
  const palettes = [
    ['#f97316', '#ec4899'],
    ['#06b6d4', '#6366f1'],
    ['#84cc16', '#14b8a6'],
    ['#eab308', '#ef4444'],
    ['#a855f7', '#3b82f6'],
    ['#f43f5e', '#f59e0b']
  ]
  const c = makeCanvas(1200, 900)
  const ctx = c.getContext('2d')!
  const [a, b] = palettes[i % palettes.length]
  const g = ctx.createLinearGradient(0, 0, 1200, 900)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1200, 900)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (const dx of [-170, 170]) {
    ctx.beginPath()
    ctx.arc(600 + dx, 380, 110, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(600 + dx, 820, 200, 300, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '700 64px Poppins, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`FOTO ${i + 1}`, 600, 120)
  return c
}

export function canvasToJpeg(c: HTMLCanvasElement, quality = 0.92): string {
  return c.toDataURL('image/jpeg', quality)
}

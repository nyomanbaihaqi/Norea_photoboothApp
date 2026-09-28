import QRCode from 'qrcode'

export async function qrCanvas(text: string, size: number): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas')
  await QRCode.toCanvas(c, text, {
    width: Math.round(size),
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' }
  })
  return c
}

export function qrDataUrl(text: string, size = 512): Promise<string> {
  return QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' })
}

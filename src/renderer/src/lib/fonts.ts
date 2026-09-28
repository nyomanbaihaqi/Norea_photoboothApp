// Font dibundel supaya teks frame tetap jalan offline.
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/great-vibes/400.css'
import '@fontsource/dancing-script/400.css'
import '@fontsource/dancing-script/700.css'
import '@fontsource/pacifico/400.css'
import '@fontsource/bebas-neue/400.css'
import { FONTS } from '@shared/defaults'
import type { TextElement } from '@shared/types'

export { FONTS }

export function fontSpec(t: Pick<TextElement, 'bold' | 'italic' | 'fontFamily'>, size: number): string {
  return `${t.italic ? 'italic ' : ''}${t.bold ? '700' : '400'} ${size}px "${t.fontFamily}"`
}

const loaded = new Set<string>()

export async function ensureFonts(texts: TextElement[]): Promise<void> {
  const specs = texts.map((t) => fontSpec(t, 40)).filter((s) => !loaded.has(s))
  await Promise.all(
    specs.map(async (s) => {
      try {
        await document.fonts.load(s)
        loaded.add(s)
      } catch {
        // pakai font fallback
      }
    })
  )
}

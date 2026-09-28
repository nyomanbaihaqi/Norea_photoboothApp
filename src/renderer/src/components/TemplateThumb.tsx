import { useEffect, useRef } from 'react'
import type { EventData, FrameTemplate } from '@shared/types'
import { composeFinal } from '@/lib/compose'
import { samplePhotos } from '@/lib/images'
import { getLayout } from '@shared/layouts'

const SAMPLE_EVENT = { name: 'Nama Acara', date: '2026-09-28', extraInfo: 'Info tambahan' }

// Pratinjau kecil template (render penuh lalu diskalakan lewat CSS).
export function TemplateThumb({
  template,
  event,
  className = ''
}: {
  template: FrameTemplate
  event?: Pick<EventData, 'name' | 'date' | 'extraInfo'>
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const ev = event && event.name ? event : SAMPLE_EVENT

  useEffect(() => {
    let cancelled = false
    const L = getLayout(template.layoutId)
    void composeFinal({
      template,
      event: ev,
      photos: samplePhotos(L.slots.length),
      filter: 'none',
      qrUrl: 'https://norea.id'
    }).then((c) => {
      const target = ref.current
      if (cancelled || !target) return
      const scale = 360 / Math.max(c.width, c.height)
      target.width = Math.round(c.width * scale)
      target.height = Math.round(c.height * scale)
      target.getContext('2d')!.drawImage(c, 0, 0, target.width, target.height)
    })
    return () => {
      cancelled = true
    }
  }, [template, ev.name, ev.date, ev.extraInfo])

  return <canvas ref={ref} className={`h-auto max-h-full max-w-full shadow-lg ${className}`} />
}

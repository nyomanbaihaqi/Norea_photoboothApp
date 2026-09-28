// Mesin sesi foto (lihat diagram di docs/02-architecture.md).
import { useCallback, useEffect, useRef, useState } from 'react'
import { getLayout } from '@shared/layouts'
import type { EventData, FrameTemplate, PrintJob, SessionView } from '@shared/types'
import { mirrorCanvas, type CameraSource } from '@/lib/camera'
import { composeFinal, composePrint } from '@/lib/compose'
import { canvasToJpeg } from '@/lib/images'
import { phoneHost } from '@/lib/phoneCamera'
import { sounds } from '@/lib/sound'

export type Phase =
  | 'idle'
  | 'countdown'
  | 'wait'
  | 'review'
  | 'reviewAll'
  | 'processing'
  | 'result'
  | 'error'

export interface BoothState {
  phase: Phase
  count: number
  shotIndex: number
  totalShots: number
  shots: string[] // thumbnail data URL
  flashKey: number
  decisionEndsAt: number
  resultImage: string
  session: SessionView | null
  printJob: PrintJob | null
  error: string
}

const INITIAL: BoothState = {
  phase: 'idle',
  count: 0,
  shotIndex: 0,
  totalShots: 0,
  shots: [],
  flashKey: 0,
  decisionEndsAt: 0,
  resultImage: '',
  session: null,
  printJob: null,
  error: ''
}

const REVIEW_MS = 8000
const REVIEW_ALL_MS = 15000

class Cancelled extends Error {}

export function useBoothSession(
  source: CameraSource | null,
  event: EventData | undefined,
  template: FrameTemplate | undefined
) {
  const [state, setState] = useState<BoothState>(INITIAL)
  const runRef = useRef(0)
  const decisionRef = useRef<((d: 'accept' | 'retake') => void) | null>(null)
  const finishTimer = useRef<number>(0)
  const patch = useCallback((p: Partial<BoothState>) => setState((s) => ({ ...s, ...p })), [])

  // Update QR/status upload ketika main memberi kabar
  useEffect(
    () =>
      window.api.sessions.onUpdated((s) =>
        setState((st) => (st.session?.id === s.id ? { ...st, session: s } : st))
      ),
    []
  )

  const cancel = useCallback(() => {
    runRef.current++
    decisionRef.current?.('accept')
    decisionRef.current = null
    window.clearTimeout(finishTimer.current)
    setState(INITIAL)
  }, [])

  useEffect(() => () => cancel(), [cancel])

  const decide = useCallback((d: 'accept' | 'retake') => {
    const fn = decisionRef.current
    decisionRef.current = null
    fn?.(d)
  }, [])

  const start = useCallback(async () => {
    if (!source || !event || !template) return
    const run = ++runRef.current
    const guard = (): void => {
      if (run !== runRef.current) throw new Cancelled()
    }
    const sleep = async (ms: number): Promise<void> => {
      await new Promise((r) => setTimeout(r, ms))
      guard()
    }
    const waitDecision = (ms: number): Promise<'accept' | 'retake'> =>
      new Promise((resolve) => {
        const t = setTimeout(() => {
          decisionRef.current = null
          resolve('accept')
        }, ms)
        decisionRef.current = (d) => {
          clearTimeout(t)
          resolve(d)
        }
      })

    const s = event.session
    const layout = getLayout(template.layoutId)
    const total = layout.slots.length
    window.clearTimeout(finishTimer.current)

    try {
      let photos: HTMLCanvasElement[] = []
      let thumbs: string[] = []
      patch({ ...INITIAL, totalShots: total })

      // Loop jepretan (ulangi semua kalau retake 'all')
      for (;;) {
        photos = []
        thumbs = []
        let i = 0
        while (i < total) {
          for (let c = s.countdown; c >= 1; c--) {
            patch({ phase: 'countdown', count: c, shotIndex: i, shots: [...thumbs] })
            if (source.kind === 'phone') phoneHost.send({ type: 'countdown', n: c })
            if (s.sound) sounds.tick()
            await sleep(1000)
          }
          if (s.sound) sounds.shutter()
          patch({ count: 0, flashKey: Date.now() })
          let photo = await source.capture()
          guard()
          if (s.mirror) photo = mirrorCanvas(photo)
          photos[i] = photo
          thumbs[i] = canvasToJpeg(scaleDown(photo, 900), 0.85)
          patch({ shots: [...thumbs] })

          if (s.retakeMode === 'each') {
            patch({ phase: 'review', shotIndex: i, decisionEndsAt: Date.now() + REVIEW_MS })
            const d = await waitDecision(REVIEW_MS)
            guard()
            if (d === 'retake') continue
          }
          i++
          if (i < total && s.delayBetween > 0) {
            patch({ phase: 'wait', shotIndex: i })
            await sleep(s.delayBetween * 1000)
          }
        }
        if (s.retakeMode !== 'all') break
        patch({ phase: 'reviewAll', decisionEndsAt: Date.now() + REVIEW_ALL_MS })
        const d = await waitDecision(REVIEW_ALL_MS)
        guard()
        if (d === 'accept') break
      }

      // Komposisi & simpan
      patch({ phase: 'processing' })
      const reserved =
        template.qr.enabled || s.showQr ? await window.api.drive.reserve(event.id) : null
      guard()
      const final = await composeFinal({
        template,
        event,
        photos,
        filter: s.filter,
        qrUrl: reserved?.link
      })
      const print = composePrint(final, layout.id)
      const r = await window.api.sessions.save({
        eventId: event.id,
        finalDataUrl: canvasToJpeg(final, 0.95),
        printDataUrl: canvasToJpeg(print, 0.95),
        rawDataUrls: photos.map((p) => canvasToJpeg(p, 0.92)),
        reservedFileId: reserved?.fileId
      })
      guard()
      if (!r.ok) throw new Error(r.error)

      let printJob: PrintJob | null = null
      if (s.autoPrint && s.copies > 0) {
        const pr = await window.api.printer.print({
          sessionId: r.data.id,
          copies: s.copies,
          widthMm: layout.printWidthMm,
          heightMm: layout.printHeightMm
        })
        if (pr.ok) printJob = pr.data
      }
      if (source.kind === 'phone') phoneHost.send({ type: 'done' })
      if (s.sound) sounds.done()
      patch({
        phase: 'result',
        resultImage: canvasToJpeg(scaleDown(final, 1600), 0.9),
        session: r.data,
        printJob
      })
      finishTimer.current = window.setTimeout(() => {
        if (run === runRef.current) setState(INITIAL)
      }, s.resultDuration * 1000)
    } catch (err) {
      if (err instanceof Cancelled) return
      console.error(err)
      patch({ phase: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  }, [source, event, template, patch])

  const printNow = useCallback(
    async (copies?: number) => {
      if (!state.session || !template || !event) return
      const layout = getLayout(template.layoutId)
      const r = await window.api.printer.print({
        sessionId: state.session.id,
        copies: copies ?? Math.max(1, event.session.copies),
        widthMm: layout.printWidthMm,
        heightMm: layout.printHeightMm
      })
      if (r.ok) patch({ printJob: r.data })
      return r
    },
    [state.session, template, event, patch]
  )

  const finish = useCallback(() => {
    window.clearTimeout(finishTimer.current)
    runRef.current++
    setState(INITIAL)
  }, [])

  return { state, start, decide, cancel, finish, printNow }
}

function scaleDown(c: HTMLCanvasElement, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(c.width, c.height))
  if (scale === 1) return c
  const out = document.createElement('canvas')
  out.width = Math.round(c.width * scale)
  out.height = Math.round(c.height * scale)
  out.getContext('2d')!.drawImage(c, 0, 0, out.width, out.height)
  return out
}

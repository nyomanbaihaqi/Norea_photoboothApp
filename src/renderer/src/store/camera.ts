import { create } from 'zustand'
import type { AppSettings } from '@shared/types'
import { openLocalCamera, PHONE_SOURCE_ID, type CameraSource } from '@/lib/camera'
import { phoneHost, phoneSource, type PhoneState } from '@/lib/phoneCamera'

// Kamera dibiarkan menyala antar halaman (Studio ↔ Mode Tamu) supaya tidak kedip.
interface CameraStore {
  deviceId: string
  resolution: AppSettings['cameraResolution']
  source: CameraSource | null
  stream: MediaStream | null
  error: string
  opening: boolean
  phoneState: PhoneState
  phonePeerId: string
  phoneError: string
  open(deviceId: string, resolution: AppSettings['cameraResolution']): Promise<void>
  close(): void
}

let openSeq = 0

export const useCamera = create<CameraStore>((set, get) => {
  phoneHost.subscribe((state, info) => {
    set({ phoneState: state, phonePeerId: info.peerId, phoneError: info.error ?? '' })
    if (get().deviceId === PHONE_SOURCE_ID) set({ stream: info.stream })
  })

  return {
    deviceId: '',
    resolution: '1080p',
    source: null,
    stream: null,
    error: '',
    opening: false,
    phoneState: 'starting',
    phonePeerId: '',
    phoneError: '',

    async open(deviceId, resolution) {
      const cur = get()
      if (cur.source && cur.deviceId === deviceId && cur.resolution === resolution) return
      const seq = ++openSeq
      cur.source?.stop()
      set({ opening: true, error: '', deviceId, resolution, source: null, stream: null })
      try {
        if (deviceId === PHONE_SOURCE_ID) {
          phoneHost.start()
          set({ source: phoneSource(), stream: phoneHost.stream, opening: false })
          return
        }
        const src = await openLocalCamera(deviceId, resolution)
        if (seq !== openSeq) return src.stop()
        set({ source: src, stream: src.stream, opening: false })
      } catch (err) {
        if (seq !== openSeq) return
        const name = (err as DOMException)?.name
        const msg =
          name === 'NotReadableError'
            ? 'Kamera sedang dipakai aplikasi lain (Zoom/OBS?)'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'Kamera tidak ditemukan, pilih kamera lain'
              : name === 'NotAllowedError'
                ? 'Izin kamera ditolak'
                : `Gagal membuka kamera: ${(err as Error).message}`
        set({ error: msg, opening: false })
      }
    },

    close() {
      ++openSeq
      get().source?.stop()
      set({ source: null, stream: null, deviceId: '' })
    }
  }
})

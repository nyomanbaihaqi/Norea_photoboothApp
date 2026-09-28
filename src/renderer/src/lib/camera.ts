// Abstraksi sumber kamera (lokal / HP). Lihat docs/05-architect-agent.md.
import type { AppSettings } from '@shared/types'
import { makeCanvas } from './images'

export interface CameraSource {
  id: string
  label: string
  kind: 'local' | 'phone'
  stream: MediaStream | null
  capture(): Promise<HTMLCanvasElement>
  stop(): void
}

export const PHONE_SOURCE_ID = 'phone'

const RES: Record<AppSettings['cameraResolution'], { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 }
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'videoinput')
}

// Ambil frame dari video dengan resolusi aslinya.
export function grabFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const c = makeCanvas(video.videoWidth || 1280, video.videoHeight || 720)
  c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height)
  return c
}

export function hiddenVideo(stream: MediaStream): Promise<HTMLVideoElement> {
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.srcObject = stream
  return new Promise((resolve) => {
    v.onloadedmetadata = () => {
      void v.play().then(() => resolve(v))
    }
  })
}

export async function openLocalCamera(
  deviceId: string,
  resolution: AppSettings['cameraResolution']
): Promise<CameraSource> {
  const { width, height } = RES[resolution]
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: 30 }
    }
  })
  const track = stream.getVideoTracks()[0]
  const video = await hiddenVideo(stream)
  return {
    id: deviceId || 'default',
    label: track?.label || 'Kamera',
    kind: 'local',
    stream,
    async capture() {
      return grabFrame(video)
    },
    stop() {
      stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }
}

export function streamResolution(stream: MediaStream | null): string {
  const s = stream?.getVideoTracks()[0]?.getSettings()
  return s?.width && s?.height ? `${s.width}×${s.height}` : '–'
}

export function mirrorCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height)
  const ctx = c.getContext('2d')!
  ctx.translate(src.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0)
  return c
}

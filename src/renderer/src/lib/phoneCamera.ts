// Kamera HP lewat WebRTC (PeerJS). HP membuka <webBaseUrl>/camera/?peer=<id>.
import Peer, { type DataConnection, type MediaConnection } from 'peerjs'
import type { CameraSource } from './camera'
import { grabFrame, hiddenVideo } from './camera'

export type PhoneState = 'starting' | 'waiting' | 'connected' | 'error'

interface Listener {
  (state: PhoneState, info: { peerId: string; error?: string; stream: MediaStream | null }): void
}

const CAPTURE_TIMEOUT = 6000

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return 'norea-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

class PhoneHost {
  private peer: Peer | null = null
  private call: MediaConnection | null = null
  private conn: DataConnection | null = null
  private video: HTMLVideoElement | null = null
  private listeners = new Set<Listener>()
  private pending = new Map<string, (blob: Blob | null) => void>()
  peerId = ''
  state: PhoneState = 'starting'
  stream: MediaStream | null = null
  error = ''

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.state, { peerId: this.peerId, error: this.error, stream: this.stream })
    return () => this.listeners.delete(fn)
  }

  private set(state: PhoneState, error = ''): void {
    this.state = state
    this.error = error
    for (const fn of this.listeners) fn(state, { peerId: this.peerId, error, stream: this.stream })
  }

  start(): void {
    if (this.peer && !this.peer.destroyed) return
    this.peerId = randomId()
    this.set('starting')
    const peer = new Peer(this.peerId, { debug: 1 })
    this.peer = peer
    peer.on('open', () => this.set(this.stream ? 'connected' : 'waiting'))
    peer.on('error', (err) => {
      const type = (err as { type?: string }).type
      if (type === 'network' || type === 'server-error' || type === 'socket-error') {
        this.set('error', 'Tidak bisa terhubung ke server sinyal (cek internet)')
      } else if (type !== 'peer-unavailable') this.set('error', err.message)
    })
    peer.on('disconnected', () => {
      if (!peer.destroyed) setTimeout(() => peer.reconnect(), 2000)
    })
    peer.on('connection', (conn) => {
      const otherPhone = this.conn?.open && this.conn.peer !== conn.peer
      if (otherPhone && !window.confirm('HP lain mau tersambung. Ganti HP yang sekarang?')) {
        conn.on('open', () => conn.close())
        return
      }
      this.conn?.close()
      this.conn = conn
      conn.on('data', (d) => this.onData(d))
      conn.on('close', () => {
        if (this.conn === conn) this.dropStream()
      })
    })
    peer.on('call', (call) => {
      if (this.call && this.call.peer !== call.peer && this.conn?.peer !== call.peer) {
        call.close()
        return
      }
      this.call?.close()
      this.call = call
      call.answer()
      call.on('stream', async (stream) => {
        this.stream = stream
        this.video = await hiddenVideo(stream)
        this.set('connected')
      })
      call.on('close', () => {
        if (this.call === call) this.dropStream()
      })
    })
  }

  private dropStream(): void {
    this.stream = null
    this.video = null
    this.call = null
    this.set(this.peer?.open ? 'waiting' : 'error', this.peer?.open ? '' : 'Terputus')
  }

  private onData(d: unknown): void {
    const msg = d as { type?: string; id?: string; data?: ArrayBuffer; mime?: string }
    if (msg?.type === 'photo' && msg.id) {
      const resolve = this.pending.get(msg.id)
      if (!resolve) return
      this.pending.delete(msg.id)
      resolve(msg.data ? new Blob([msg.data], { type: msg.mime || 'image/jpeg' }) : null)
    }
  }

  send(msg: Record<string, unknown>): void {
    if (this.conn?.open) void this.conn.send(msg)
  }

  // Minta foto resolusi penuh dari HP. Fallback: ambil frame video.
  async capture(): Promise<HTMLCanvasElement> {
    if (this.conn?.open) {
      const id = Math.random().toString(36).slice(2)
      const blob = await new Promise<Blob | null>((resolve) => {
        this.pending.set(id, resolve)
        this.send({ type: 'capture', id })
        setTimeout(() => {
          if (this.pending.delete(id)) resolve(null)
        }, CAPTURE_TIMEOUT)
      })
      if (blob) {
        const bmp = await createImageBitmap(blob)
        const c = document.createElement('canvas')
        c.width = bmp.width
        c.height = bmp.height
        c.getContext('2d')!.drawImage(bmp, 0, 0)
        bmp.close()
        return c
      }
    }
    if (!this.video) throw new Error('HP tidak tersambung')
    return grabFrame(this.video)
  }

  stop(): void {
    this.call?.close()
    this.conn?.close()
    this.peer?.destroy()
    this.peer = null
    this.stream = null
    this.video = null
    this.set('starting')
  }
}

export const phoneHost = new PhoneHost()

export function phoneSource(): CameraSource {
  return {
    id: 'phone',
    label: 'Kamera HP',
    kind: 'phone',
    get stream() {
      return phoneHost.stream
    },
    capture: () => phoneHost.capture(),
    stop: () => undefined // koneksi HP dibiarkan hidup saat ganti halaman
  }
}

export function phoneUrl(webBaseUrl: string, peerId: string): string {
  return `${webBaseUrl.replace(/\/+$/, '')}/camera/?peer=${encodeURIComponent(peerId)}`
}

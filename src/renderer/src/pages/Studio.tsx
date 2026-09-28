import { useEffect, useMemo, useState } from 'react'
import { getLayout } from '@shared/layouts'
import type { SessionSettings } from '@shared/types'
import { Keypad, PinDots } from '@/components/Keypad'
import { Stage } from '@/components/Stage'
import { TemplateThumb } from '@/components/TemplateThumb'
import { Badge, Button, Card, Select, Toggle } from '@/components/ui'
import { useBoothSession } from '@/hooks/useBoothSession'
import { listCameras, PHONE_SOURCE_ID, streamResolution } from '@/lib/camera'
import { FILTERS } from '@/lib/filters'
import { phoneUrl } from '@/lib/phoneCamera'
import { qrDataUrl } from '@/lib/qr'
import { unwrap, useActiveEvent, useApp, useTemplate } from '@/store/app'
import { useCamera } from '@/store/camera'

export function Studio({ guest = false }: { guest?: boolean }) {
  const settings = useApp((s) => s.settings)!
  const events = useApp((s) => s.events)
  const setSettings = useApp((s) => s.setSettings)
  const setEvents = useApp((s) => s.setEvents)
  const setGuest = useApp((s) => s.setGuest)
  const go = useApp((s) => s.go)
  const toast = useApp((s) => s.toast)
  const event = useActiveEvent()
  const template = useTemplate(event?.templateId)
  const cam = useCamera()
  const booth = useBoothSession(cam.source, event, template)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  // Buka kamera sesuai pengaturan
  useEffect(() => {
    void cam.open(settings.cameraDeviceId, settings.cameraResolution)
  }, [settings.cameraDeviceId, settings.cameraResolution])

  useEffect(() => {
    const refresh = (): void => void listCameras().then(setDevices)
    refresh()
    navigator.mediaDevices.addEventListener('devicechange', refresh)
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh)
  }, [cam.stream])

  // Spasi / Enter = mulai sesi (operator & remote/pedal keyboard)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (document.querySelector('[data-pin-open]')) return
      if ((e.key === ' ' || e.key === 'Enter') && booth.state.phase === 'idle') {
        e.preventDefault()
        void booth.start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booth])

  const canStart = !!cam.source && !!cam.stream && !!event && !!template && booth.state.phase === 'idle'

  const stage = (
    <Stage
      stream={cam.stream}
      event={event}
      booth={booth.state}
      guest={guest}
      cameraError={cam.error || (cam.deviceId === PHONE_SOURCE_ID ? 'Menunggu HP tersambung…' : '')}
      onStart={() => void booth.start()}
      onDecide={booth.decide}
      onFinish={booth.finish}
      onPrint={() => void booth.printNow()}
    />
  )

  if (guest) return <GuestShell onExit={() => void setGuest(false)}>{stage}</GuestShell>

  async function updateSession(patch: Partial<SessionSettings>): Promise<void> {
    if (!event) return
    const list = unwrap(await window.api.events.save({ ...event, session: { ...event.session, ...patch } }))
    if (list) setEvents(list)
  }

  async function selectCamera(id: string): Promise<void> {
    const s = unwrap(await window.api.settings.update({ cameraDeviceId: id }))
    if (s) setSettings(s)
  }

  async function selectEvent(id: string): Promise<void> {
    const s = unwrap(await window.api.events.setActive(id))
    if (s) setSettings(s)
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-3 text-xs font-semibold tracking-wider uppercase">
          <span className="flex items-center gap-1.5 rounded bg-live px-2 py-1 text-white">
            <span className="anim-live h-2 w-2 rounded-full bg-white" /> Program
          </span>
          <span className="text-muted">
            {cam.source?.label ?? '—'} · {streamResolution(cam.stream)}
          </span>
          <span className="ml-auto text-muted normal-case">Spasi / Enter = mulai sesi</span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-line">{stage}</div>
        <div className="mt-3 flex h-24 gap-2">
          {Array.from({ length: booth.state.totalShots || (template ? getLayout(template.layoutId).slots.length : 0) }).map(
            (_, i) => (
              <div key={i} className="aspect-[4/3] h-full overflow-hidden rounded-lg border border-line bg-panel">
                {booth.state.shots[i] ? (
                  <img src={booth.state.shots[i]} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">Foto {i + 1}</div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      <aside className="w-80 shrink-0 space-y-3 overflow-y-auto border-l border-line bg-panel/50 p-4">
        <Button
          variant="live"
          size="lg"
          className="w-full"
          disabled={!canStart}
          onClick={() => void booth.start()}
        >
          ● MULAI SESI
        </Button>
        {booth.state.phase !== 'idle' && booth.state.phase !== 'result' && (
          <Button variant="ghost" className="w-full" onClick={booth.cancel}>
            Batalkan sesi
          </Button>
        )}
        <Button
          variant="primary"
          className="w-full"
          disabled={!event}
          onClick={() => {
            toast('info', 'Mode Tamu aktif. Tekan Esc lalu masukkan PIN untuk keluar.')
            void setGuest(true)
          }}
        >
          🙋 Masuk Mode Tamu
        </Button>

        <Card title="Event">
          {events.length === 0 ? (
            <Button className="w-full" onClick={() => go('events')}>
              + Buat event dulu
            </Button>
          ) : (
            <Select
              value={event?.id ?? ''}
              onChange={(v) => void selectEvent(v)}
              options={events.map((e) => ({ value: e.id, label: e.name || '(tanpa nama)' }))}
            />
          )}
          {template && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-24 w-20 items-center justify-center">
                <TemplateThumb template={template} event={event} />
              </div>
              <div className="text-xs">
                <div className="font-semibold">{template.name}</div>
                <div className="text-muted">{getLayout(template.layoutId).name}</div>
                <button className="mt-1 text-brand" onClick={() => go('events')}>
                  Ganti template →
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Kamera">
          <Select
            value={cam.deviceId || settings.cameraDeviceId}
            onChange={(v) => void selectCamera(v)}
            options={[
              { value: '', label: 'Kamera default' },
              ...devices.map((d, i) => ({ value: d.deviceId, label: d.label || `Kamera ${i + 1}` })),
              { value: PHONE_SOURCE_ID, label: '📱 Kamera HP (nirkabel)' }
            ]}
          />
          {cam.error && <p className="mt-2 text-xs text-red-400">{cam.error}</p>}
          {cam.deviceId === PHONE_SOURCE_ID && <PhonePanel />}
        </Card>

        {event && (
          <Card title="Opsi cepat sesi">
            <div className="space-y-1">
              <Toggle label="Mirror" checked={event.session.mirror} onChange={(v) => void updateSession({ mirror: v })} />
              <Toggle
                label="Auto-print"
                checked={event.session.autoPrint}
                onChange={(v) => void updateSession({ autoPrint: v })}
              />
              <Toggle label="Tampilkan QR" checked={event.session.showQr} onChange={(v) => void updateSession({ showQr: v })} />
              <div className="pt-2">
                <div className="mb-1 text-xs text-muted">Filter</div>
                <Select
                  value={event.session.filter}
                  onChange={(v) => void updateSession({ filter: v })}
                  options={FILTERS.map((f) => ({ value: f.id, label: f.name }))}
                />
              </div>
              <div className="pt-2">
                <div className="mb-1 text-xs text-muted">Countdown</div>
                <Select
                  value={String(event.session.countdown)}
                  onChange={(v) => void updateSession({ countdown: Number(v) })}
                  options={[...new Set([3, 5, 10, event.session.countdown])]
                    .sort((a, b) => a - b)
                    .map((n) => ({ value: String(n), label: `${n} detik` }))}
                />
              </div>
            </div>
            <button className="mt-2 text-xs text-brand" onClick={() => go('events')}>
              Semua opsi sesi →
            </button>
          </Card>
        )}
        <PrintStatus />
      </aside>
    </div>
  )
}

function PrintStatus() {
  const jobs = useApp((s) => s.printers.jobs).slice(0, 4)
  const go = useApp((s) => s.go)
  return (
    <Card title="Antrian print" actions={<button className="text-xs text-brand" onClick={() => go('printers')}>Kelola</button>}>
      {jobs.length === 0 ? (
        <p className="text-xs text-muted">Belum ada job</p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{j.printer || 'menunggu printer'}</span>
              <Badge tone={j.status === 'sent' ? 'green' : j.status === 'error' ? 'red' : 'amber'}>
                {j.status === 'sent' ? 'terkirim' : j.status === 'error' ? 'gagal' : j.status === 'sending' ? 'mengirim' : 'antri'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function PhonePanel() {
  const settings = useApp((s) => s.settings)!
  const go = useApp((s) => s.go)
  const { phoneState, phonePeerId, phoneError } = useCamera()
  const [qr, setQr] = useState('')
  const url = useMemo(
    () => (settings.webBaseUrl && phonePeerId ? phoneUrl(settings.webBaseUrl, phonePeerId) : ''),
    [settings.webBaseUrl, phonePeerId]
  )
  useEffect(() => {
    if (url) void qrDataUrl(url, 400).then(setQr)
  }, [url])

  if (!settings.webBaseUrl) {
    return (
      <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-300">
        Isi <b>URL Web Pendamping</b> (Vercel) dulu di Pengaturan.
        <button className="mt-1 block text-brand" onClick={() => go('settings')}>
          Buka Pengaturan →
        </button>
      </div>
    )
  }
  return (
    <div className="mt-3 space-y-2 text-center text-xs">
      <Badge tone={phoneState === 'connected' ? 'green' : phoneState === 'error' ? 'red' : 'amber'}>
        {phoneState === 'connected'
          ? 'HP tersambung'
          : phoneState === 'waiting'
            ? 'Menunggu HP scan QR'
            : phoneState === 'error'
              ? 'Error'
              : 'Menyiapkan…'}
      </Badge>
      {phoneError && <p className="text-red-400">{phoneError}</p>}
      {qr && phoneState !== 'connected' && (
        <>
          <img src={qr} className="mx-auto w-44 rounded-lg bg-white p-1.5" />
          <p className="text-muted">Scan pakai HP, lalu izinkan akses kamera</p>
          <div className="flex items-center gap-1 rounded-md bg-bg p-1.5 text-left">
            <span data-phone-url={url} className="min-w-0 flex-1 truncate text-[10px] text-muted">
              {url}
            </span>
            <button
              className="shrink-0 rounded bg-panel-2 px-2 py-0.5 text-[10px] hover:bg-line"
              onClick={() => void navigator.clipboard.writeText(url)}
            >
              Salin
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function GuestShell({ children, onExit }: { children: React.ReactNode; onExit(): void }) {
  const [asking, setAsking] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [taps, setTaps] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setAsking(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 5x tap pojok kiri atas = minta PIN (untuk layar sentuh tanpa keyboard)
  useEffect(() => {
    if (taps === 0) return
    if (taps >= 5) {
      setTaps(0)
      setAsking(true)
    }
    const t = setTimeout(() => setTaps(0), 2000)
    return () => clearTimeout(t)
  }, [taps])

  async function submit(): Promise<void> {
    const r = await window.api.pin.verify(pin)
    setPin('')
    if (r.ok) {
      setAsking(false)
      onExit()
    } else setError(r.error)
  }

  return (
    <div className="fixed inset-0 z-40 bg-black">
      {children}
      <button className="absolute top-0 left-0 h-20 w-20 opacity-0" onClick={() => setTaps((n) => n + 1)} />
      {asking && (
        <div
          data-pin-open
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setAsking(false)}
        >
          <div className="w-80 rounded-2xl bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center font-semibold">Masukkan PIN operator</div>
            <PinDots length={Math.max(4, pin.length)} filled={pin.length} />
            <div className="my-3 h-5 text-center text-sm text-red-400">{error}</div>
            <Keypad
              value={pin}
              onChange={(v) => {
                setError('')
                setPin(v)
              }}
              onSubmit={() => void submit()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { getLayout } from '@shared/layouts'
import type { SessionView } from '@shared/types'
import { Badge, Button, Card, Empty, Modal, PageHeader, Segmented, Select } from '@/components/ui'
import { composeFinal, composePrint } from '@/lib/compose'
import { samplePhotos } from '@/lib/images'
import { qrDataUrl } from '@/lib/qr'
import { unwrap, useApp, useTemplate } from '@/store/app'

type Mockup = 'print' | 'white' | 'wood' | 'black' | 'hand'

const MOCKUPS: { value: Mockup; label: string }[] = [
  { value: 'print', label: 'Cetak polos' },
  { value: 'white', label: 'Bingkai putih' },
  { value: 'wood', label: 'Bingkai kayu' },
  { value: 'black', label: 'Bingkai hitam' },
  { value: 'hand', label: 'Dipegang' }
]

export function Preview() {
  const events = useApp((s) => s.events)
  const settings = useApp((s) => s.settings)!
  const [eventId, setEventId] = useState(settings.activeEventId || events[0]?.id || '')
  const event = events.find((e) => e.id === eventId)
  const template = useTemplate(event?.templateId)
  const [mockup, setMockup] = useState<Mockup>('white')
  const [source, setSource] = useState<'sample' | 'last'>('sample')
  const [image, setImage] = useState('')
  const [sheet, setSheet] = useState('')
  const [sessions, setSessions] = useState<SessionView[]>([])

  const loadSessions = useCallback(async () => {
    if (eventId) setSessions(await window.api.sessions.list(eventId))
  }, [eventId])

  useEffect(() => {
    void loadSessions()
    return window.api.sessions.onUpdated((s) => setSessions((list) => list.map((x) => (x.id === s.id ? s : x))))
  }, [loadSessions])

  useEffect(() => {
    if (!template || !event) return
    const last = sessions[0]
    if (source === 'last' && last) {
      setImage(last.finalUrl)
      setSheet('')
      return
    }
    const L = getLayout(template.layoutId)
    void composeFinal({ template, event, photos: samplePhotos(L.slots.length), filter: event.session.filter, qrUrl: 'https://norea.id' }).then(
      (c) => {
        setImage(c.toDataURL('image/jpeg', 0.9))
        setSheet(L.duplicateForPrint ? composePrint(c, L.id).toDataURL('image/jpeg', 0.85) : '')
      }
    )
  }, [template, event, source, sessions])

  if (!event || !template) {
    return (
      <div className="p-6">
        <PageHeader title="Preview & Galeri" />
        <Empty>Buat event dulu di menu Event.</Empty>
      </div>
    )
  }

  const L = getLayout(template.layoutId)

  return (
    <div className="h-full overflow-y-auto p-6">
      <PageHeader
        title="Preview & Galeri"
        desc="Gambaran hasil jadi (foto + frame + bingkai) dan semua sesi di event ini."
        actions={
          <>
            <div className="w-64">
              <Select value={eventId} onChange={setEventId} options={events.map((e) => ({ value: e.id, label: e.name || '(tanpa nama)' }))} />
            </div>
            <Button onClick={() => void window.api.sessions.openFolder(eventId)}>📂 Buka folder</Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div
          className="flex min-h-[520px] items-center justify-center gap-10 overflow-hidden rounded-2xl p-10"
          style={{ background: 'linear-gradient(180deg,#e9e4dc 0%,#d9d2c7 75%,#bfb6a8 100%)' }}
        >
          {image && <Framed src={image} mockup={mockup} landscape={L.width > L.height} strip={L.duplicateForPrint} />}
        </div>
        <div className="space-y-3">
          <Card title="Tampilan">
            <div className="space-y-3">
              <Segmented value={mockup} onChange={setMockup} options={MOCKUPS} />
              <Segmented
                value={source}
                onChange={setSource}
                options={[
                  { value: 'sample', label: 'Foto contoh' },
                  { value: 'last', label: 'Sesi terakhir' }
                ]}
              />
            </div>
          </Card>
          <Card title="Info cetak">
            <dl className="space-y-1 text-sm">
              <Row k="Template" v={template.name} />
              <Row k="Layout" v={L.name} />
              <Row k="Kertas" v={L.paper} />
              <Row k="Resolusi" v={`${L.width}×${L.height}px`} />
              <Row k="Jumlah foto" v={String(L.slots.length)} />
            </dl>
          </Card>
          {sheet && (
            <Card title="Lembar cetak (2 strip)">
              <img src={sheet} className="mx-auto max-h-64 bg-white shadow" />
              <p className="mt-2 text-xs text-muted">Dicetak di 1 lembar 4R, lalu dipotong tengah.</p>
            </Card>
          )}
        </div>
      </div>

      <Gallery sessions={sessions} onChanged={loadSessions} />
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  )
}

function Framed({ src, mockup, landscape, strip }: { src: string; mockup: Mockup; landscape: boolean; strip: boolean }) {
  const size = landscape ? 'max-w-[640px] max-h-[440px]' : strip ? 'max-h-[560px] max-w-[200px]' : 'max-h-[520px] max-w-[380px]'
  const img = <img src={src} className={`block ${size}`} />
  const shadow = '0 25px 50px -12px rgba(0,0,0,.45)'
  switch (mockup) {
    case 'print':
      return <div style={{ boxShadow: shadow, transform: 'rotate(-2deg)' }}>{img}</div>
    case 'hand':
      return (
        <div className="relative" style={{ transform: 'rotate(-6deg)' }}>
          <div style={{ boxShadow: shadow }}>{img}</div>
          <div className="absolute -bottom-10 left-1/2 h-24 w-28 -translate-x-1/2 rounded-t-[60px] bg-[#d9a57b]" style={{ boxShadow: 'inset 0 6px 10px rgba(0,0,0,.2)' }} />
        </div>
      )
    case 'white':
    case 'black':
    case 'wood': {
      const frame =
        mockup === 'white'
          ? { border: '22px solid #fafafa', boxShadow: `${shadow}, inset 0 0 0 1px #ddd` }
          : mockup === 'black'
            ? { border: '22px solid #151515', boxShadow: shadow }
            : {
                border: '26px solid transparent',
                borderImage: 'linear-gradient(135deg,#8b5a2b,#b07a45 35%,#6f4420 60%,#a0703f) 1',
                boxShadow: shadow
              }
      return (
        <div style={frame}>
          <div className="bg-white p-6" style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,.25)' }}>
            {img}
          </div>
        </div>
      )
    }
  }
}

function Gallery({ sessions, onChanged }: { sessions: SessionView[]; onChanged(): void }) {
  const events = useApp((s) => s.events)
  const templates = useApp((s) => s.templates)
  const toast = useApp((s) => s.toast)
  const [open, setOpen] = useState<SessionView | null>(null)
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (open?.shareLink) void qrDataUrl(open.shareLink, 400).then(setQr)
    else setQr('')
  }, [open?.shareLink])

  async function reprint(s: SessionView): Promise<void> {
    const ev = events.find((e) => e.id === s.eventId)
    const t = templates.find((x) => x.id === ev?.templateId)
    const L = getLayout(t?.layoutId ?? '')
    unwrap(
      await window.api.printer.print({ sessionId: s.id, copies: 1, widthMm: L.printWidthMm, heightMm: L.printHeightMm }),
      'Masuk antrian print'
    )
  }

  async function remove(s: SessionView): Promise<void> {
    if (!window.confirm('Hapus sesi ini beserta file fotonya di laptop?')) return
    unwrap(await window.api.sessions.delete(s.id), 'Sesi dihapus')
    setOpen(null)
    onChanged()
  }

  const tone = (st: SessionView['uploadStatus']) =>
    st === 'done' ? 'green' : st === 'error' ? 'red' : st === 'skipped' ? 'gray' : 'amber'
  const label = (st: SessionView['uploadStatus']) =>
    ({ done: 'Ter-upload', error: 'Gagal upload', skipped: 'Tanpa Drive', pending: 'Antri upload', uploading: 'Mengupload' })[st]

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-bold">Galeri sesi ({sessions.length})</h2>
      {sessions.length === 0 ? (
        <Empty>Belum ada sesi foto di event ini.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {sessions.map((s) => (
            <button key={s.id} onClick={() => setOpen(s)} className="group overflow-hidden rounded-xl border border-line bg-panel text-left">
              <div className="flex aspect-square items-center justify-center bg-black/40 p-2">
                <img src={s.finalUrl} loading="lazy" className="max-h-full max-w-full" />
              </div>
              <div className="flex items-center justify-between p-2 text-xs">
                <span>{new Date(s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                <Badge tone={tone(s.uploadStatus)}>{label(s.uploadStatus)}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="Detail sesi" wide>
        {open && (
          <div className="grid gap-5 md:grid-cols-[1fr_220px]">
            <img src={open.finalUrl} className="max-h-[65vh] w-full object-contain" />
            <div className="space-y-3 text-sm">
              <div>{new Date(open.createdAt).toLocaleString('id-ID')}</div>
              <Badge tone={tone(open.uploadStatus)}>{label(open.uploadStatus)}</Badge>
              {open.uploadError && <p className="text-xs text-red-400">{open.uploadError}</p>}
              <div>Dicetak: {open.printCount}x</div>
              {qr && <img src={qr} className="w-full rounded-lg bg-white p-2" />}
              <div className="flex flex-col gap-2">
                <Button variant="primary" onClick={() => void reprint(open)}>
                  🖨️ Cetak ulang
                </Button>
                {(open.uploadStatus === 'error' || open.uploadStatus === 'pending') && (
                  <Button
                    onClick={() => {
                      void window.api.drive.retry(open.id)
                      toast('info', 'Upload diulang')
                    }}
                  >
                    ☁️ Upload ulang
                  </Button>
                )}
                {open.shareLink && <Button onClick={() => void window.api.app.openExternal(open.shareLink!)}>🔗 Buka link</Button>}
                <Button onClick={() => void window.api.app.openPath(open.finalPath)}>🖼️ Buka file</Button>
                <Button variant="danger" onClick={() => void remove(open)}>
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

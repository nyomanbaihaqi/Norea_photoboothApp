import { useEffect, useMemo, useRef, useState } from 'react'
import { FONTS } from '@shared/defaults'
import { getLayout, LAYOUTS } from '@shared/layouts'
import type { Decor, FrameTemplate, TextElement, TextField } from '@shared/types'
import { uid } from '@shared/utils'
import { TemplateThumb } from '@/components/TemplateThumb'
import { Badge, Button, Card, Field, NumberInput, PageHeader, Segmented, Select, TextInput, Toggle } from '@/components/ui'
import { composeFinal } from '@/lib/compose'
import { layoutGuide } from '@/lib/compose'
import { fileToDataUrl, loadImage, samplePhotos } from '@/lib/images'
import { unwrap, useActiveEvent, useApp } from '@/store/app'

const DECOR: { value: Decor; label: string }[] = [
  { value: 'none', label: 'Tanpa dekorasi' },
  { value: 'goldline', label: 'Garis tepi elegan' },
  { value: 'dots', label: 'Polkadot' },
  { value: 'confetti', label: 'Confetti' },
  { value: 'hearts', label: 'Hati' },
  { value: 'film', label: 'Film strip' }
]

const FIELD_LABEL: Record<TextField, string> = {
  name: 'Nama event',
  date: 'Tanggal',
  extra: 'Info tambahan',
  custom: 'Teks bebas'
}

export function FrameGenerator() {
  const templates = useApp((s) => s.templates)
  const setTemplates = useApp((s) => s.setTemplates)
  const event = useActiveEvent()
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '')
  const [draft, setDraft] = useState<FrameTemplate | null>(null)

  // Template baru (belum disimpan) tidak ada di daftar, jadi jangan dibuang
  useEffect(() => {
    const t = templates.find((x) => x.id === selectedId)
    setDraft((d) => (t ? structuredClone(t) : d?.id === selectedId ? d : null))
  }, [selectedId])

  const saved = templates.find((t) => t.id === draft?.id)
  const isNew = draft && !saved
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved)

  function copyAsNew(): void {
    if (!draft) return
    const t: FrameTemplate = { ...structuredClone(draft), id: uid('tpl_'), name: `${draft.name} (custom)`, builtin: false }
    setDraft(t)
    setSelectedId(t.id)
  }

  async function save(): Promise<void> {
    if (!draft) return
    const list = unwrap(await window.api.templates.save(draft), 'Template disimpan')
    if (list) setTemplates(list)
  }

  async function remove(): Promise<void> {
    if (!draft || !window.confirm(`Hapus template "${draft.name}"?`)) return
    const list = unwrap(await window.api.templates.delete(draft.id), 'Template dihapus')
    if (!list) return
    setTemplates(list)
    setSelectedId(list[0]?.id ?? '')
  }

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 overflow-y-auto border-r border-line p-3">
        <div className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">Template</div>
        <div className="space-y-2">
          {isNew && draft && (
            <div className="rounded-lg border border-brand/60 p-2 text-xs">
              {draft.name} <Badge tone="amber">baru</Badge>
            </div>
          )}
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${
                selectedId === t.id ? 'bg-panel-2' : 'hover:bg-panel-2/50'
              }`}
            >
              <div className="flex h-14 w-12 shrink-0 items-center justify-center">
                <TemplateThumb template={t} event={event} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{t.name}</div>
                <div className="text-[10px] text-muted">{t.builtin ? 'Bawaan' : 'Custom'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {draft ? (
        <Editor
          draft={draft}
          onChange={setDraft}
          header={
            <PageHeader
              title={draft.name}
              desc={draft.builtin ? 'Template bawaan. Klik "Salin & edit" untuk menyesuaikan.' : 'Klik teks di daftar, lalu geser posisinya di pratinjau.'}
              actions={
                <>
                  <Button onClick={copyAsNew}>{draft.builtin ? 'Salin & edit' : 'Duplikat'}</Button>
                  {!draft.builtin && !isNew && (
                    <Button variant="danger" onClick={() => void remove()}>
                      Hapus
                    </Button>
                  )}
                  {!draft.builtin && (
                    <Button variant="primary" disabled={!dirty} onClick={() => void save()}>
                      Simpan
                    </Button>
                  )}
                </>
              }
            />
          }
        />
      ) : (
        <div className="p-6 text-muted">Pilih template</div>
      )}
    </div>
  )
}

function Editor({
  draft,
  onChange,
  header
}: {
  draft: FrameTemplate
  onChange(t: FrameTemplate): void
  header: React.ReactNode
}) {
  const event = useActiveEvent()
  const toast = useApp((s) => s.toast)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<string>('')
  const dragging = useRef(false)
  const layout = getLayout(draft.layoutId)
  const readOnly = !!draft.builtin
  const photos = useMemo(() => samplePhotos(layout.slots.length), [layout.id])
  const set = (p: Partial<FrameTemplate>): void => {
    if (!readOnly) onChange({ ...draft, ...p })
  }
  const setText = (id: string, p: Partial<TextElement>): void =>
    set({ texts: draft.texts.map((t) => (t.id === id ? { ...t, ...p } : t)) })

  // Render pratinjau (debounce ringan)
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      void composeFinal({
        template: draft,
        event: event ?? { name: 'Nama Acara', date: '2026-09-28', extraInfo: 'Info tambahan' },
        photos,
        filter: 'none',
        qrUrl: 'https://norea.id/contoh'
      }).then((c) => {
        const target = canvasRef.current
        if (cancelled || !target) return
        target.width = c.width
        target.height = c.height
        const ctx = target.getContext('2d')!
        ctx.drawImage(c, 0, 0)
        const sel = draft.texts.find((x) => x.id === selected)
        if (sel) {
          ctx.strokeStyle = '#f59e0b'
          ctx.lineWidth = 3
          ctx.setLineDash([12, 8])
          ctx.beginPath()
          ctx.moveTo(0, sel.y * c.height)
          ctx.lineTo(c.width, sel.y * c.height)
          ctx.stroke()
        }
      })
    }, 80)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [draft, event, photos, selected])

  function moveTo(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (readOnly || !selected) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    if (selected === 'qr') set({ qr: { ...draft.qr, x, y } })
    else setText(selected, { x, y })
  }

  async function upload(kind: 'overlayImage' | 'backgroundImage', file: File | undefined): Promise<void> {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    const img = await loadImage(dataUrl)
    const url = unwrap(await window.api.assets.save(dataUrl))
    if (!url) return
    set({ [kind]: url } as Partial<FrameTemplate>)
    if (img.width !== layout.width || img.height !== layout.height) {
      toast('info', `Ukuran gambar ${img.width}×${img.height}px, ideal ${layout.width}×${layout.height}px (akan diregangkan)`)
    }
  }

  function downloadGuide(): void {
    const a = document.createElement('a')
    a.href = layoutGuide(layout.id).toDataURL('image/png')
    a.download = `panduan-frame-${layout.id}-${layout.width}x${layout.height}.png`
    a.click()
  }

  function addText(field: TextField): void {
    const t: TextElement = {
      id: uid('t_'),
      field,
      text: field === 'custom' ? 'Teks baru' : '',
      x: 0.5,
      y: 0.9,
      fontSize: Math.round(layout.width / 18),
      fontFamily: 'Poppins',
      color: '#111111',
      align: 'center',
      bold: false,
      italic: false,
      dateFormat: 'long'
    }
    set({ texts: [...draft.texts, t] })
    setSelected(t.id)
  }

  const sel = draft.texts.find((t) => t.id === selected)

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col p-6">
        {header}
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-[repeating-conic-gradient(#1f232c_0%_25%,#171a21_0%_50%)] bg-[length:24px_24px] p-6">
          <canvas
            ref={canvasRef}
            className={`max-h-full max-w-full shadow-2xl ${!readOnly && selected ? 'cursor-crosshair' : ''}`}
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              moveTo(e)
            }}
            onPointerMove={(e) => dragging.current && moveTo(e)}
            onPointerUp={() => (dragging.current = false)}
          />
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          {layout.name} · {layout.width}×{layout.height}px (300 DPI) · {layout.paper}
          {event ? ` · teks dari event "${event.name}"` : ''}
        </p>
      </div>

      <aside className={`w-96 shrink-0 space-y-3 overflow-y-auto border-l border-line p-4 ${readOnly ? 'pointer-events-none opacity-60' : ''}`}>
        <Card title="Dasar">
          <div className="space-y-3">
            <Field label="Nama template">
              <TextInput value={draft.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Layout / ukuran cetak">
              <Select value={draft.layoutId} onChange={(v) => set({ layoutId: v })} options={LAYOUTS.map((l) => ({ value: l.id, label: l.name }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Warna latar">
                <input type="color" value={draft.background} onChange={(e) => set({ background: e.target.value })} className="h-9 w-full rounded" />
              </Field>
              <Field label="Warna aksen">
                <input type="color" value={draft.accent} onChange={(e) => set({ accent: e.target.value })} className="h-9 w-full rounded" />
              </Field>
            </div>
            <Field label="Dekorasi">
              <Select value={draft.decor} onChange={(v) => set({ decor: v })} options={DECOR} />
            </Field>
          </div>
        </Card>

        <Card title="Desain sendiri (PNG)">
          <div className="space-y-3 text-xs">
            <p className="text-muted">
              Bikin desain di Canva/Photoshop ukuran <b>{layout.width}×{layout.height}px</b>. Overlay = PNG transparan di atas foto
              (slot foto dibolongin). Background = gambar di belakang foto.
            </p>
            <Button size="sm" onClick={downloadGuide}>
              ⬇ Unduh panduan ukuran
            </Button>
            <AssetRow label="Overlay (di atas foto)" url={draft.overlayImage} onPick={(f) => void upload('overlayImage', f)} onClear={() => set({ overlayImage: '' })} />
            <AssetRow label="Background (di bawah foto)" url={draft.backgroundImage} onPick={(f) => void upload('backgroundImage', f)} onClear={() => set({ backgroundImage: '' })} />
          </div>
        </Card>

        <Card title="Foto">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Sudut">
              <NumberInput value={draft.photoRadius} min={0} max={200} onChange={(v) => set({ photoRadius: v })} />
            </Field>
            <Field label="Tebal garis">
              <NumberInput value={draft.photoBorderWidth} min={0} max={60} onChange={(v) => set({ photoBorderWidth: v })} />
            </Field>
            <Field label="Warna garis">
              <input type="color" value={draft.photoBorderColor} onChange={(e) => set({ photoBorderColor: e.target.value })} className="h-9 w-full rounded" />
            </Field>
          </div>
        </Card>

        <Card title="Teks">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(['name', 'date', 'extra', 'custom'] as TextField[]).map((f) => (
              <Button key={f} size="sm" onClick={() => addText(f)}>
                + {FIELD_LABEL[f]}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            {draft.texts.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  selected === t.id ? 'bg-brand/15 ring-1 ring-brand' : 'bg-bg hover:bg-panel-2'
                }`}
              >
                <span>
                  {FIELD_LABEL[t.field]}
                  {t.field === 'custom' && <span className="text-muted">: {t.text}</span>}
                </span>
                <button
                  className="text-muted hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    set({ texts: draft.texts.filter((x) => x.id !== t.id) })
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {sel && (
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              {sel.field === 'custom' && (
                <Field label="Isi teks">
                  <TextInput value={sel.text} onChange={(e) => setText(sel.id, { text: e.target.value })} />
                </Field>
              )}
              {sel.field === 'date' && (
                <Field label="Format tanggal">
                  <Segmented
                    value={sel.dateFormat ?? 'long'}
                    onChange={(v) => setText(sel.id, { dateFormat: v })}
                    options={[
                      { value: 'long', label: '28 September 2026' },
                      { value: 'short', label: '28 Sep 2026' },
                      { value: 'numeric', label: '28.09.2026' }
                    ]}
                  />
                </Field>
              )}
              <Field label="Font">
                <Select value={sel.fontFamily} onChange={(v) => setText(sel.id, { fontFamily: v })} options={FONTS.map((f) => ({ value: f, label: f }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ukuran (px)">
                  <NumberInput value={sel.fontSize} min={8} max={400} onChange={(v) => setText(sel.id, { fontSize: v })} />
                </Field>
                <Field label="Warna">
                  <input type="color" value={sel.color} onChange={(e) => setText(sel.id, { color: e.target.value })} className="h-9 w-full rounded" />
                </Field>
              </div>
              <Field label="Rata">
                <Segmented
                  value={sel.align}
                  onChange={(v) => setText(sel.id, { align: v })}
                  options={[
                    { value: 'left', label: 'Kiri' },
                    { value: 'center', label: 'Tengah' },
                    { value: 'right', label: 'Kanan' }
                  ]}
                />
              </Field>
              <div className="flex gap-4">
                <Toggle label="Tebal" checked={sel.bold} onChange={(v) => setText(sel.id, { bold: v })} />
                <Toggle label="Miring" checked={sel.italic} onChange={(v) => setText(sel.id, { italic: v })} />
              </div>
              <p className="text-xs text-muted">Klik / geser di pratinjau untuk memindah posisi teks.</p>
            </div>
          )}
        </Card>

        <Card title="QR di cetakan">
          <Toggle
            label="Cetak QR softcopy di foto"
            hint="Butuh Drive terhubung & online saat sesi"
            checked={draft.qr.enabled}
            onChange={(v) => set({ qr: { ...draft.qr, enabled: v } })}
          />
          {draft.qr.enabled && (
            <div className="mt-3 space-y-3">
              <Field label={`Ukuran (${Math.round(draft.qr.size * 100)}% lebar)`}>
                <input
                  type="range"
                  min={0.06}
                  max={0.4}
                  step={0.01}
                  value={draft.qr.size}
                  onChange={(e) => set({ qr: { ...draft.qr, size: Number(e.target.value) } })}
                  className="w-full"
                />
              </Field>
              <Button size="sm" onClick={() => setSelected('qr')} variant={selected === 'qr' ? 'primary' : 'subtle'}>
                Geser posisi QR di pratinjau
              </Button>
            </div>
          )}
        </Card>
      </aside>
    </div>
  )
}

function AssetRow({ label, url, onPick, onClear }: { label: string; url: string; onPick(f?: File): void; onClear(): void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-bg p-2">
      <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-panel-2">{url && <img src={url} className="h-full w-full object-contain" />}</div>
      <div className="flex-1 text-xs">{label}</div>
      <label className="cursor-pointer rounded-md bg-panel-2 px-2 py-1 text-xs hover:bg-line">
        Pilih
        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
      {url && (
        <button className="text-xs text-red-400" onClick={onClear}>
          Hapus
        </button>
      )}
    </div>
  )
}

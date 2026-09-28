import { useEffect, useState } from 'react'
import { newEvent } from '@shared/defaults'
import { getLayout } from '@shared/layouts'
import type { EventData, SessionSettings } from '@shared/types'
import { formatDateId, uid } from '@shared/utils'
import { TemplateThumb } from '@/components/TemplateThumb'
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  NumberInput,
  PageHeader,
  Segmented,
  Select,
  TextInput,
  Toggle
} from '@/components/ui'
import { FILTERS } from '@/lib/filters'
import { unwrap, useApp } from '@/store/app'

export function Events() {
  const events = useApp((s) => s.events)
  const settings = useApp((s) => s.settings)!
  const setEvents = useApp((s) => s.setEvents)
  const setSettings = useApp((s) => s.setSettings)
  const toast = useApp((s) => s.toast)
  const [selectedId, setSelectedId] = useState<string>(settings.activeEventId || events[0]?.id || '')
  const [draft, setDraft] = useState<EventData | null>(null)

  // Draft baru (belum disimpan) tidak ada di daftar, jadi jangan dibuang
  useEffect(() => {
    const e = events.find((x) => x.id === selectedId)
    setDraft((d) => (e ? structuredClone(e) : d?.id === selectedId ? d : null))
  }, [selectedId])

  const isNew = draft && !events.some((e) => e.id === draft.id)
  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(events.find((e) => e.id === draft.id))

  async function save(): Promise<void> {
    if (!draft) return
    const list = unwrap(await window.api.events.save(draft), 'Event disimpan')
    if (!list) return
    setEvents(list)
    const state = await window.api.state.get()
    setSettings(state.settings)
  }

  async function activate(id: string): Promise<void> {
    const s = unwrap(await window.api.events.setActive(id), 'Event aktif diganti')
    if (s) setSettings(s)
  }

  async function remove(): Promise<void> {
    if (!draft || !window.confirm(`Hapus event "${draft.name}"? Foto di folder tidak ikut terhapus.`)) return
    const list = unwrap(await window.api.events.delete(draft.id), 'Event dihapus')
    if (!list) return
    setEvents(list)
    setSettings((await window.api.state.get()).settings)
    setSelectedId(list[0]?.id ?? '')
  }

  function create(): void {
    const e = newEvent()
    setDraft(e)
    setSelectedId(e.id)
  }

  function duplicate(): void {
    if (!draft) return
    const e = { ...structuredClone(draft), id: uid('ev_'), name: `${draft.name} (salinan)`, createdAt: Date.now() }
    setDraft(e)
    setSelectedId(e.id)
    toast('info', 'Salinan dibuat, klik Simpan')
  }

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 overflow-y-auto border-r border-line p-4">
        <Button variant="primary" className="mb-4 w-full" onClick={create}>
          + Event baru
        </Button>
        {events.length === 0 && !isNew && <Empty>Belum ada event</Empty>}
        <div className="space-y-1">
          {isNew && draft && (
            <div className="rounded-lg border border-brand/50 bg-panel-2 px-3 py-2.5 text-sm">
              {draft.name || 'Event baru'} <Badge tone="amber">belum disimpan</Badge>
            </div>
          )}
          {events.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                selectedId === e.id ? 'bg-panel-2' : 'hover:bg-panel-2/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm font-semibold">{e.name || '(tanpa nama)'}</span>
                {settings.activeEventId === e.id && <Badge tone="green">aktif</Badge>}
              </div>
              <div className="text-xs text-muted">{formatDateId(e.date)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        {!draft ? (
          <Empty>Pilih atau buat event</Empty>
        ) : (
          <>
            <PageHeader
              title={draft.name || 'Event baru'}
              desc="Data event dipakai untuk teks frame, folder simpan, dan upload Drive."
              actions={
                <>
                  {!isNew && settings.activeEventId !== draft.id && (
                    <Button onClick={() => void activate(draft.id)}>Jadikan aktif</Button>
                  )}
                  {!isNew && <Button onClick={duplicate}>Duplikat</Button>}
                  {!isNew && (
                    <Button variant="danger" onClick={() => void remove()}>
                      Hapus
                    </Button>
                  )}
                  <Button variant="primary" disabled={!dirty} onClick={() => void save()}>
                    Simpan
                  </Button>
                </>
              }
            />
            <EventForm draft={draft} onChange={setDraft} />
          </>
        )}
      </div>
    </div>
  )
}

function EventForm({ draft, onChange }: { draft: EventData; onChange(e: EventData): void }) {
  const templates = useApp((s) => s.templates)
  const drive = useApp((s) => s.drive)
  const [folder, setFolder] = useState<{ ok: boolean; text: string } | null>(null)
  const set = (p: Partial<EventData>): void => onChange({ ...draft, ...p })
  const setS = (p: Partial<SessionSettings>): void => onChange({ ...draft, session: { ...draft.session, ...p } })
  const s = draft.session

  async function checkFolder(): Promise<void> {
    setFolder({ ok: true, text: 'Mengecek…' })
    const r = await window.api.drive.checkFolder(draft.driveFolderUrl)
    setFolder(r.ok ? { ok: true, text: `✓ Folder "${r.data.name}"` } : { ok: false, text: r.error })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Info event (dicetak di frame)">
        <div className="space-y-3">
          <Field label="Nama" hint="Contoh: Rina & Budi, Ulang Tahun Kayla ke-7, Gathering PT Maju">
            <TextInput value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nama acara" />
          </Field>
          <Field label="Tanggal">
            <TextInput type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Info tambahan (opsional)" hint="Contoh: #RinaBudiForever, Hotel Mulia Jakarta">
            <TextInput value={draft.extraInfo} onChange={(e) => set({ extraInfo: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card title="Google Drive">
        <div className="space-y-3">
          <Field
            label="Link folder Drive"
            hint="Buka folder di Google Drive → salin link dari address bar → tempel di sini. Kosongkan kalau tidak upload."
          >
            <div className="flex gap-2">
              <TextInput
                value={draft.driveFolderUrl}
                onChange={(e) => {
                  setFolder(null)
                  set({ driveFolderUrl: e.target.value })
                }}
                placeholder="https://drive.google.com/drive/folders/…"
              />
              <Button disabled={!draft.driveFolderUrl} onClick={() => void checkFolder()}>
                Cek
              </Button>
            </div>
          </Field>
          {folder && <p className={`text-sm ${folder.ok ? 'text-emerald-400' : 'text-red-400'}`}>{folder.text}</p>}
          {!drive?.connected && (
            <p className="text-xs text-amber-300">Akun Google belum terhubung. Hubungkan di menu Pengaturan.</p>
          )}
        </div>
      </Card>

      <Card title="Template frame" className="xl:col-span-2">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-6">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => set({ templateId: t.id })}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                draft.templateId === t.id ? 'border-brand bg-brand/10' : 'border-line hover:border-muted'
              }`}
            >
              <div className="flex h-36 items-center justify-center">
                <TemplateThumb template={t} event={draft} />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold">{t.name}</div>
                <div className="text-[10px] text-muted">{getLayout(t.layoutId).name}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Alur sesi foto">
        <div className="space-y-4">
          <Field label="Countdown tiap jepretan">
            <Segmented
              value={s.countdown}
              onChange={(v) => setS({ countdown: v })}
              options={[3, 5, 7, 10].map((n) => ({ value: n, label: `${n} dtk` }))}
            />
          </Field>
          <Field label="Jeda antar jepretan">
            <NumberInput value={s.delayBetween} min={0} max={30} onChange={(v) => setS({ delayBetween: v })} suffix="detik" />
          </Field>
          <Field label="Retake (ulang foto)">
            <Segmented
              value={s.retakeMode}
              onChange={(v) => setS({ retakeMode: v })}
              options={[
                { value: 'none', label: 'Tidak ada' },
                { value: 'each', label: 'Per foto' },
                { value: 'all', label: 'Semua di akhir' }
              ]}
            />
          </Field>
          <Field label="Filter warna">
            <Select value={s.filter} onChange={(v) => setS({ filter: v })} options={FILTERS.map((f) => ({ value: f.id, label: f.name }))} />
          </Field>
          <p className="text-xs text-muted">Jumlah jepretan otomatis mengikuti layout template.</p>
        </div>
      </Card>

      <Card title="Hasil, cetak & tampilan">
        <div className="space-y-1">
          <Toggle label="Mirror (seperti cermin)" checked={s.mirror} onChange={(v) => setS({ mirror: v })} />
          <Toggle label="Efek flash layar" checked={s.flash} onChange={(v) => setS({ flash: v })} />
          <Toggle label="Suara countdown & jepret" checked={s.sound} onChange={(v) => setS({ sound: v })} />
          <Toggle
            label="Auto-print"
            hint="Mati = tamu/operator tekan tombol Cetak dulu"
            checked={s.autoPrint}
            onChange={(v) => setS({ autoPrint: v })}
          />
          <Toggle label="Tampilkan QR softcopy" checked={s.showQr} onChange={(v) => setS({ showQr: v })} />
          <div className="grid grid-cols-2 gap-3 pt-3">
            <Field label="Jumlah cetak">
              <NumberInput value={s.copies} min={0} max={10} onChange={(v) => setS({ copies: v })} suffix="lembar" />
            </Field>
            <Field label="Layar hasil tampil">
              <NumberInput value={s.resultDuration} min={5} max={300} onChange={(v) => setS({ resultDuration: v })} suffix="detik" />
            </Field>
          </div>
        </div>
      </Card>
    </div>
  )
}

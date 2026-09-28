import { useState } from 'react'
import type { PrinterInfo, PrintMode } from '@shared/types'
import { Badge, Button, Card, Empty, PageHeader, Segmented, Toggle } from '@/components/ui'
import { unwrap, useApp } from '@/store/app'

export function Printers() {
  const snap = useApp((s) => s.printers)
  const settings = useApp((s) => s.settings)!
  const setSettings = useApp((s) => s.setSettings)
  const [refreshing, setRefreshing] = useState(false)
  const [testing, setTesting] = useState('')

  async function save(printers: PrinterInfo[], mode: PrintMode): Promise<void> {
    unwrap(await window.api.printer.setConfig(printers.map((p) => ({ name: p.name, enabled: p.enabled })), mode))
    const state = await window.api.state.get()
    setSettings(state.settings)
  }

  function toggle(name: string, enabled: boolean): void {
    void save(
      snap.printers.map((p) => (p.name === name ? { ...p, enabled } : p)),
      settings.printMode
    )
  }

  async function refresh(): Promise<void> {
    setRefreshing(true)
    useApp.setState({ printers: await window.api.printer.refresh() })
    setRefreshing(false)
  }

  async function test(name: string): Promise<void> {
    setTesting(name)
    unwrap(await window.api.printer.test(name), `Test print dikirim ke ${name}`)
    setTesting('')
  }

  async function setPaper(v: 'layout' | 'driver'): Promise<void> {
    const s = unwrap(await window.api.settings.update({ printPaperMode: v }))
    if (s) setSettings(s)
  }

  const enabled = snap.printers.filter((p) => p.enabled)

  return (
    <div className="h-full overflow-y-auto p-6">
      <PageHeader
        title="Printer"
        desc="Install driver printer di Windows dulu, lalu centang printer yang dipakai. Print otomatis dibagi ke printer yang siap."
        actions={
          <Button onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? 'Memuat…' : '🔄 Muat ulang'}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card title={`Printer terdeteksi (${snap.printers.length})`}>
          {snap.printers.length === 0 ? (
            <Empty>Tidak ada printer. Install driver printer di Windows lalu klik Muat ulang.</Empty>
          ) : (
            <div className="divide-y divide-line">
              {snap.printers.map((p) => (
                <div key={p.name} className="flex items-center gap-4 py-3">
                  <div className="w-12">
                    <Toggle label="" checked={p.enabled} onChange={(v) => toggle(p.name, v)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {p.displayName} {p.isDefault && <Badge>default</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <Badge tone={p.available ? 'green' : 'red'}>{p.status}</Badge>
                      <Badge tone={p.jobCount + p.inFlight > 0 ? 'amber' : 'gray'}>Antrian: {p.jobCount + p.inFlight}</Badge>
                    </div>
                  </div>
                  <Button size="sm" disabled={!!testing} onClick={() => void test(p.name)}>
                    {testing === p.name ? 'Mengirim…' : 'Test print'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Cara membagi print">
            <Segmented
              value={settings.printMode}
              onChange={(v) => void save(snap.printers, v)}
              options={[
                { value: 'least-busy', label: 'Paling kosong' },
                { value: 'round-robin', label: 'Bergantian' }
              ]}
            />
            <p className="mt-3 text-xs text-muted">
              {settings.printMode === 'least-busy'
                ? 'Job dikirim ke printer dengan antrian paling sedikit. Printer offline/error/kertas habis dilewati.'
                : 'Job dikirim bergiliran ke printer aktif (1 → 2 → 3 → 1 …). Printer bermasalah dilewati.'}
            </p>
            <p className="mt-2 text-xs">
              Aktif: <b>{enabled.length}</b> printer, siap: <b>{enabled.filter((p) => p.available).length}</b>
            </p>
          </Card>

          <Card title="Ukuran kertas">
            <Segmented
              value={settings.printPaperMode}
              onChange={(v) => void setPaper(v)}
              options={[
                { value: 'layout', label: 'Ikut layout' },
                { value: 'driver', label: 'Default driver' }
              ]}
            />
            <p className="mt-3 text-xs text-muted">
              Kalau hasil cetak terpotong / ada margin, pilih <b>Default driver</b> lalu atur ukuran kertas (misal 4x6) di pengaturan
              driver Windows.
            </p>
          </Card>

          <Card
            title="Riwayat job"
            actions={
              <button className="text-xs text-brand" onClick={() => void window.api.printer.clearDone()}>
                Bersihkan
              </button>
            }
          >
            {snap.jobs.length === 0 ? (
              <p className="text-xs text-muted">Belum ada job</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
                {snap.jobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {j.label} · {j.copies}x → {j.printer || '—'}
                      {j.error && <span className="block text-red-400">{j.error}</span>}
                    </span>
                    <Badge tone={j.status === 'sent' ? 'green' : j.status === 'error' ? 'red' : 'amber'}>
                      {{ queued: 'antri', sending: 'mengirim', sent: 'terkirim', error: 'gagal' }[j.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {snap.jobs.some((j) => j.status === 'queued') && enabled.every((p) => !p.available) && (
              <p className="mt-3 text-xs text-amber-300">
                {enabled.length === 0 ? 'Belum ada printer yang dicentang.' : 'Semua printer aktif sedang bermasalah.'} Job
                akan jalan otomatis setelah ada printer siap.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

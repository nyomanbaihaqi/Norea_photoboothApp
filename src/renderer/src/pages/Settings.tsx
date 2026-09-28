import { useEffect, useState } from 'react'
import { ChangePin } from '@/components/ChangePin'
import { Badge, Button, Card, Field, PageHeader, Segmented, TextInput, Toggle } from '@/components/ui'
import { unwrap, useApp } from '@/store/app'

export function Settings() {
  const settings = useApp((s) => s.settings)!
  const setSettings = useApp((s) => s.setSettings)
  const [webUrl, setWebUrl] = useState(settings.webBaseUrl)
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.api.app.version().then(setVersion)
  }, [])

  async function update(patch: Parameters<typeof window.api.settings.update>[0], okText?: string): Promise<void> {
    const s = unwrap(await window.api.settings.update(patch), okText)
    if (s) setSettings(s)
  }

  async function chooseFolder(): Promise<void> {
    const dir = await window.api.app.chooseFolder(settings.saveDir)
    if (dir) await update({ saveDir: dir }, 'Folder simpan diganti')
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <PageHeader title="Pengaturan" desc={`Norea Photobooth App v${version}`} />
      <div className="grid gap-5 xl:grid-cols-2">
        <GoogleCard />

        <Card title="Web pendamping (Vercel)">
          <div className="space-y-3">
            <Field
              label="URL web pendamping"
              hint="Dipakai untuk halaman kamera HP (/camera) dan halaman download tamu (/d). Contoh: https://norea-photobooth.vercel.app"
            >
              <div className="flex gap-2">
                <TextInput value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="https://…vercel.app" />
                <Button
                  variant="primary"
                  disabled={webUrl.trim().replace(/\/+$/, '') === settings.webBaseUrl}
                  onClick={() => void update({ webBaseUrl: webUrl }, 'URL disimpan')}
                >
                  Simpan
                </Button>
              </div>
            </Field>
            {!settings.webBaseUrl && (
              <p className="text-xs text-amber-300">
                Kalau kosong: QR langsung ke Google Drive, dan kamera HP tidak bisa dipakai.
              </p>
            )}
          </div>
        </Card>

        <Card title="Kamera">
          <Field label="Resolusi yang diminta" hint="Kamera memakai resolusi terdekat yang didukung. Resolusi aktual tampil di Studio.">
            <Segmented
              value={settings.cameraResolution}
              onChange={(v) => void update({ cameraResolution: v })}
              options={[
                { value: '720p', label: '720p' },
                { value: '1080p', label: '1080p' },
                { value: '4k', label: '4K' }
              ]}
            />
          </Field>
          <p className="mt-3 text-xs text-muted">
            DSLR/mirrorless: pakai mode webcam (misal Canon EOS Webcam Utility, Sony Imaging Edge Webcam) atau capture card HDMI,
            lalu pilih di Studio.
          </p>
        </Card>

        <Card title="Penyimpanan foto">
          <Field label="Folder simpan">
            <div className="flex gap-2">
              <TextInput value={settings.saveDir} readOnly />
              <Button onClick={() => void chooseFolder()}>Ganti</Button>
            </div>
          </Field>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void window.api.app.openPath(settings.saveDir)}>
              📂 Buka folder
            </Button>
            <Button size="sm" onClick={() => void window.api.app.openLogs()}>
              📄 Buka log
            </Button>
          </div>
        </Card>

        <UpdateCard onToggle={(v) => void update({ autoUpdate: v })} />

        <Card title="PIN operator">
          <ChangePin />
        </Card>
      </div>
    </div>
  )
}

function GoogleCard() {
  const settings = useApp((s) => s.settings)!
  const drive = useApp((s) => s.drive)
  const setSettings = useApp((s) => s.setSettings)
  const [clientId, setClientId] = useState(settings.google.clientId)
  const [secret, setSecret] = useState('')
  const g = settings.google

  async function saveClient(): Promise<void> {
    const s = unwrap(await window.api.drive.setClient(clientId, secret), 'Client Google disimpan')
    if (s) {
      setSettings(s)
      setSecret('')
    }
  }

  async function connect(): Promise<void> {
    const s = unwrap(await window.api.drive.connect(), 'Google Drive terhubung')
    if (s) setSettings(s)
  }

  async function disconnect(): Promise<void> {
    if (!window.confirm('Putuskan akun Google? Upload berikutnya akan tertahan.')) return
    const s = unwrap(await window.api.drive.disconnect())
    if (s) setSettings(s)
  }

  return (
    <Card
      title="Google Drive"
      actions={
        g.connected ? <Badge tone="green">Terhubung</Badge> : <Badge tone="amber">Belum terhubung</Badge>
      }
    >
      <div className="space-y-3">
        {g.connected ? (
          <>
            <p className="text-sm">
              Login sebagai <b>{g.email || '(email tidak terbaca)'}</b>
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone={drive?.online ? 'green' : 'red'}>{drive?.online ? 'Online' : 'Offline'}</Badge>
              <Badge tone={drive?.pending ? 'amber' : 'gray'}>Antri: {drive?.pending ?? 0}</Badge>
              <Badge tone={drive?.failed ? 'red' : 'gray'}>Gagal: {drive?.failed ?? 0}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!drive?.failed} onClick={() => void window.api.drive.retry()}>
                Ulangi yang gagal
              </Button>
              <Button size="sm" variant="danger" onClick={() => void disconnect()}>
                Putuskan
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted">
              Butuh OAuth Client (tipe <b>Desktop app</b>) dari Google Cloud Console. Langkah lengkap ada di docs/19-deployment.md.
            </p>
            <Field label="Client ID">
              <TextInput value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
            </Field>
            <Field label="Client Secret" hint={g.hasSecret ? 'Sudah tersimpan. Isi hanya kalau mau mengganti.' : undefined}>
              <TextInput type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={g.hasSecret ? '••••••••' : 'GOCSPX-…'} />
            </Field>
            <div className="flex gap-2">
              <Button disabled={!clientId || (clientId === g.clientId && !secret)} onClick={() => void saveClient()}>
                Simpan client
              </Button>
              <Button variant="primary" disabled={!g.clientId || !g.hasSecret || drive?.busy} onClick={() => void connect()}>
                {drive?.busy ? 'Menunggu login di browser…' : 'Hubungkan Google'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

function UpdateCard({ onToggle }: { onToggle(v: boolean): void }) {
  const settings = useApp((s) => s.settings)!
  const status = useApp((s) => s.update)
  const [busy, setBusy] = useState(false)

  async function check(): Promise<void> {
    setBusy(true)
    useApp.setState({ update: await window.api.update.check() })
    setBusy(false)
  }

  async function install(): Promise<void> {
    if (!window.confirm('Aplikasi akan ditutup, update dipasang, lalu dibuka lagi. Lanjut?')) return
    unwrap(await window.api.update.install())
  }

  const s = status?.state ?? 'idle'
  const text: Record<string, string> = {
    disabled: 'Update otomatis hanya aktif di versi terinstal (bukan mode development).',
    idle: 'Belum dicek.',
    checking: 'Mengecek update…',
    none: 'Sudah versi terbaru.',
    downloading: `Mendownload v${status?.version ?? ''}… ${status?.percent ?? 0}%`,
    ready: `Versi ${status?.version} sudah didownload. Dipasang otomatis saat aplikasi ditutup, atau pasang sekarang.`,
    error: `Gagal cek update: ${status?.error ?? ''}`
  }

  return (
    <Card
      title="Update aplikasi"
      actions={<Badge tone={s === 'ready' ? 'green' : s === 'error' ? 'red' : 'gray'}>v{status?.currentVersion}</Badge>}
    >
      <div className="space-y-3">
        <Toggle
          label="Update otomatis"
          hint="Cek tiap 4 jam & download di background. Tidak pernah restart sendiri."
          checked={settings.autoUpdate}
          onChange={onToggle}
        />
        <p className={`text-sm ${s === 'error' ? 'text-red-400' : s === 'ready' ? 'text-emerald-400' : 'text-muted'}`}>{text[s]}</p>
        {s === 'downloading' && (
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full bg-brand transition-all" style={{ width: `${status?.percent ?? 0}%` }} />
          </div>
        )}
        {status?.checkedAt && s !== 'downloading' && (
          <p className="text-xs text-muted">Terakhir dicek {new Date(status.checkedAt).toLocaleString('id-ID')}</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" disabled={busy || s === 'disabled' || s === 'checking' || s === 'downloading'} onClick={() => void check()}>
            {busy || s === 'checking' ? 'Mengecek…' : 'Cek update sekarang'}
          </Button>
          {s === 'ready' && (
            <Button size="sm" variant="primary" onClick={() => void install()}>
              Restart & pasang
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

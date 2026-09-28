import { useActiveEvent, useApp, type Page } from '@/store/app'

const MENU: { id: Page; label: string; icon: string; soon?: boolean }[] = [
  { id: 'studio', label: 'Studio', icon: '🎥' },
  { id: 'events', label: 'Event', icon: '📅' },
  { id: 'frames', label: 'Frame Generator', icon: '🖼️' },
  { id: 'preview', label: 'Preview & Galeri', icon: '👁️' },
  { id: 'printers', label: 'Printer', icon: '🖨️' },
  { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
  { id: 'ai', label: 'AI Photobooth', icon: '✨', soon: true }
]

export function Sidebar() {
  const page = useApp((s) => s.page)
  const go = useApp((s) => s.go)
  const lock = useApp((s) => s.lock)
  const printers = useApp((s) => s.printers.printers)
  const drive = useApp((s) => s.drive)
  const update = useApp((s) => s.update)
  const event = useActiveEvent()

  const active = printers.filter((p) => p.enabled)
  const ready = active.filter((p) => p.available)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <div className="px-5 pt-5 pb-4">
        <div className="text-xl font-bold tracking-tight">
          NOREA<span className="text-brand">.</span>
        </div>
        <div className="text-xs text-muted">Photobooth App</div>
      </div>

      <div className="mx-3 mb-3 rounded-lg bg-bg px-3 py-2">
        <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">Event aktif</div>
        <div className="truncate text-sm font-semibold">{event?.name || 'Belum ada event'}</div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {MENU.map((m) => (
          <button
            key={m.id}
            onClick={() => go(m.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              page === m.id ? 'bg-panel-2 font-semibold text-white' : 'text-gray-400 hover:bg-panel-2/60 hover:text-white'
            }`}
          >
            <span className="w-5 text-center">{m.icon}</span>
            <span className="flex-1 text-left">{m.label}</span>
            {m.soon && <span className="rounded bg-line px-1.5 py-0.5 text-[10px] text-muted">Segera</span>}
          </button>
        ))}
      </nav>

      {update?.state === 'ready' && (
        <button
          onClick={() => go('settings')}
          className="mx-3 mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-left text-xs text-emerald-300"
        >
          ⬆️ Update v{update.version} siap dipasang
        </button>
      )}

      <div className="space-y-2 border-t border-line p-4 text-xs">
        <Status
          label="Printer"
          ok={ready.length > 0}
          text={active.length ? `${ready.length}/${active.length} siap` : 'Belum dipilih'}
        />
        <Status
          label="Drive"
          ok={!!drive?.connected && drive.online}
          text={
            !drive?.connected
              ? 'Belum terhubung'
              : !drive.online
                ? `Offline · ${drive.pending} antri`
                : drive.pending
                  ? `Upload ${drive.pending}…`
                  : 'Terhubung'
          }
        />
        <button onClick={lock} className="mt-2 w-full rounded-lg border border-line py-2 text-muted hover:text-white">
          🔒 Kunci
        </button>
      </div>
    </aside>
  )
}

function Status({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        {text}
      </span>
    </div>
  )
}

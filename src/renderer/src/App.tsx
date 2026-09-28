import { useEffect } from 'react'
import { ChangePin } from '@/components/ChangePin'
import { Sidebar } from '@/components/Sidebar'
import { Toasts } from '@/components/Toasts'
import { Modal } from '@/components/ui'
import { AiBooth } from '@/pages/AiBooth'
import { Events } from '@/pages/Events'
import { FrameGenerator } from '@/pages/FrameGenerator'
import { Lock } from '@/pages/Lock'
import { Preview } from '@/pages/Preview'
import { Printers } from '@/pages/Printers'
import { Settings } from '@/pages/Settings'
import { Studio } from '@/pages/Studio'
import { useApp } from '@/store/app'

export function App() {
  const { loaded, unlocked, guest, page, mustChangePin, load, pinChanged } = useApp()

  useEffect(() => {
    void load()
  }, [load])

  if (!loaded) {
    return <div className="flex h-full items-center justify-center text-muted">Memuat…</div>
  }

  if (guest) {
    return (
      <>
        <Studio guest />
        <Toasts />
      </>
    )
  }

  if (!unlocked) return <Lock />

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1">
        {page === 'studio' && <Studio />}
        {page === 'events' && <Events />}
        {page === 'frames' && <FrameGenerator />}
        {page === 'preview' && <Preview />}
        {page === 'printers' && <Printers />}
        {page === 'settings' && <Settings />}
        {page === 'ai' && <AiBooth />}
      </main>
      <Modal open={mustChangePin} onClose={() => undefined} title="Ganti PIN default dulu ya">
        <p className="mb-4 text-sm text-muted">
          PIN masih <b>1234</b>. Ganti dulu supaya tamu tidak bisa keluar dari Mode Tamu.
        </p>
        <ChangePin forced onDone={pinChanged} />
      </Modal>
      <Toasts />
    </div>
  )
}

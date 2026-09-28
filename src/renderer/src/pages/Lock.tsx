import { useCallback, useState } from 'react'
import { Keypad, PinDots } from '@/components/Keypad'
import { useApp } from '@/store/app'

export function Lock() {
  const unlock = useApp((s) => s.unlock)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = useCallback(async () => {
    if (busy || pin.length < 4) return
    setBusy(true)
    const r = await window.api.pin.verify(pin)
    setBusy(false)
    setPin('')
    if (r.ok) unlock(r.data.mustChange)
    else setError(r.error)
  }, [busy, pin, unlock])

  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,#1f232c,#0f1115)]">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="text-4xl font-bold tracking-tight">
            NOREA<span className="text-brand">.</span>
          </div>
          <div className="mt-1 text-sm text-muted">Photobooth App · Masuk operator</div>
        </div>
        <PinDots length={Math.max(4, pin.length)} filled={pin.length} />
        <div className="mt-3 h-5 text-center text-sm text-red-400">{error}</div>
        <div className="mt-4">
          <Keypad
            value={pin}
            onChange={(v) => {
              setError('')
              setPin(v)
            }}
            onSubmit={submit}
          />
        </div>
      </div>
    </div>
  )
}

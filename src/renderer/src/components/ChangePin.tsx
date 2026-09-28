import { useState } from 'react'
import { useApp } from '@/store/app'
import { Button, Field, TextInput } from './ui'

export function ChangePin({ onDone, forced }: { onDone?: () => void; forced?: boolean }) {
  const toast = useApp((s) => s.toast)
  const [oldPin, setOldPin] = useState(forced ? '1234' : '')
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const digits = (v: string): string => v.replace(/\D/g, '').slice(0, 8)

  async function submit(): Promise<void> {
    setError('')
    if (newPin.length < 4) return setError('PIN baru minimal 4 angka')
    if (newPin !== confirm) return setError('Konfirmasi PIN tidak sama')
    const r = await window.api.pin.change(oldPin, newPin)
    if (!r.ok) return setError(r.error)
    toast('ok', 'PIN berhasil diganti')
    setOldPin('')
    setNewPin('')
    setConfirm('')
    onDone?.()
  }

  return (
    <div className="space-y-3">
      {!forced && (
        <Field label="PIN lama">
          <TextInput type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(digits(e.target.value))} />
        </Field>
      )}
      <Field label="PIN baru (4–8 angka)">
        <TextInput type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(digits(e.target.value))} />
      </Field>
      <Field label="Ulangi PIN baru">
        <TextInput
          type="password"
          inputMode="numeric"
          value={confirm}
          onChange={(e) => setConfirm(digits(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
      </Field>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button variant="primary" onClick={() => void submit()} className="w-full">
        Simpan PIN
      </Button>
    </div>
  )
}

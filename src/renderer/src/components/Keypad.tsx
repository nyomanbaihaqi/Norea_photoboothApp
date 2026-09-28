import { useEffect } from 'react'

export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full border-2 ${i < filled ? 'border-brand bg-brand' : 'border-line'}`}
        />
      ))}
    </div>
  )
}

export function Keypad({
  value,
  onChange,
  onSubmit,
  maxLength = 8
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  maxLength?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (/^\d$/.test(e.key) && value.length < maxLength) onChange(value + e.key)
      else if (e.key === 'Backspace') onChange(value.slice(0, -1))
      else if (e.key === 'Enter') onSubmit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onChange, onSubmit, maxLength])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'hapus', '0', 'ok']
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => {
            if (k === 'hapus') onChange(value.slice(0, -1))
            else if (k === 'ok') onSubmit()
            else if (value.length < maxLength) onChange(value + k)
          }}
          className={`h-16 rounded-xl text-2xl font-semibold transition active:scale-95 ${
            k === 'ok'
              ? 'bg-brand text-black hover:bg-brand-2'
              : k === 'hapus'
                ? 'bg-panel-2 text-base text-muted hover:bg-line'
                : 'bg-panel-2 hover:bg-line'
          }`}
        >
          {k === 'hapus' ? '⌫' : k === 'ok' ? 'OK' : k}
        </button>
      ))}
    </div>
  )
}

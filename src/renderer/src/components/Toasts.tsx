import { useApp } from '@/store/app'

export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto rounded-lg border px-4 py-3 text-left text-sm shadow-xl ${
            t.kind === 'error'
              ? 'border-red-500/40 bg-red-950 text-red-200'
              : t.kind === 'ok'
                ? 'border-emerald-500/40 bg-emerald-950 text-emerald-200'
                : 'border-line bg-panel text-gray-200'
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}

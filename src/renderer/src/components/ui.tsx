import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'live' | 'ghost' | 'danger' | 'subtle'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-black hover:bg-brand-2',
  live: 'bg-live text-white hover:bg-red-500',
  ghost: 'bg-transparent border border-line text-gray-200 hover:bg-panel-2',
  danger: 'bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10',
  subtle: 'bg-panel-2 text-gray-200 hover:bg-line'
}

export function Button({
  variant = 'subtle',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-4 text-lg' }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${sizes[size]} ${className}`}
    />
  )
}

export function Card({
  title,
  actions,
  children,
  className = ''
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-panel ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">{title}</h3>
          <div className="flex gap-2">{actions}</div>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted/80">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-gray-100 outline-none focus:border-brand'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        className={inputCls}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {suffix && <span className="text-xs text-muted">{suffix}</span>}
    </div>
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left"
    >
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-5.5' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-bg p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
            value === o.value ? 'bg-brand text-black' : 'text-gray-300 hover:bg-panel-2'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({
  tone = 'gray',
  children
}: {
  tone?: 'gray' | 'green' | 'red' | 'amber' | 'blue'
  children: ReactNode
}) {
  const tones = {
    gray: 'bg-line text-gray-300',
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
    amber: 'bg-amber-500/15 text-amber-400',
    blue: 'bg-sky-500/15 text-sky-400'
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className={`max-h-full w-full overflow-auto rounded-2xl border border-line bg-panel p-6 ${wide ? 'max-w-3xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="text-2xl leading-none text-muted hover:text-white" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
      {children}
    </div>
  )
}

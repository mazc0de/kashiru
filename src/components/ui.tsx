import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { num, type StockStatus } from '../lib/format'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-teal-700/40',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/40',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Input({ className = '', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={`min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:bg-slate-100 ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 ${className}`}
      {...props}
    />
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

/** Input Rupiah/angka bulat dengan pemisah ribuan. */
export function NumberInput({
  value,
  onChange,
  allowNegative = false,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number
  onChange: (n: number) => void
  allowNegative?: boolean
}) {
  return (
    <Input
      inputMode="numeric"
      value={value === 0 ? '' : num(value)}
      placeholder="0"
      onChange={(e) => {
        const neg = allowNegative && e.target.value.trim().startsWith('-')
        const digits = e.target.value.replace(/\D/g, '')
        const n = digits ? Number(digits.slice(0, 15)) : 0
        onChange(neg ? -n : n)
      }}
      {...props}
    />
  )
}

export function ErrorBox({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</div>
}

export function WarnBox({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{children}</div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</div>
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return <div className="p-6 text-center text-sm text-slate-500">{label}</div>
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const statusStyle: Record<StockStatus, string> = {
  aman: 'bg-emerald-100 text-emerald-800',
  menipis: 'bg-amber-100 text-amber-800',
  habis: 'bg-red-100 text-red-700',
}

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[status]}`}>
      {status}
    </span>
  )
}

/** Saklar on/off dengan label, untuk fitur opsional (mis. Diskon). */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-600"
    >
      <span
        className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-teal-700' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </span>
      {label}
    </button>
  )
}

export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-md px-3 text-sm font-medium ${value === o.value ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

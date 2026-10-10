import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { CircleAlert, TriangleAlert, X } from 'lucide-react'
import { num, type StockStatus } from '../lib/format'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary:
    'bg-teal-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-teal-800 disabled:bg-teal-700/40 disabled:shadow-none',
  secondary:
    'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 shadow-panel hover:bg-slate-50 hover:ring-slate-400 disabled:text-slate-400 disabled:hover:bg-white disabled:hover:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/40',
  ghost: 'text-slate-700 hover:bg-slate-200/60 disabled:text-slate-400 disabled:hover:bg-transparent',
}

/** Fokus keyboard yang terlihat; dipakai juga oleh tombol/tautan di halaman. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-medium whitespace-nowrap transition-[background-color,box-shadow,transform,color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${focusRing} ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Input({ className = '', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={`min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 shadow-panel transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-slate-500 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:border-slate-300 ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-panel transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-slate-500 hover:border-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 ${className}`}
      {...props}
    />
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{hint}</span>}
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
  return (
    <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
      <CircleAlert size={18} className="mt-px shrink-0 text-red-600" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function WarnBox({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <TriangleAlert size={18} className="mt-px shrink-0 text-amber-600" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-slate-200/80 bg-white shadow-panel ${className}`}>{children}</div>
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Status memuat: kerangka abu-abu berdenyut, label tetap terbaca pembaca layar. */
export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div role="status" className="space-y-3 p-4">
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-2 text-sm text-slate-500" aria-hidden>
        <span className="size-2 animate-pulse rounded-full bg-teal-600" />
        {label}
      </div>
      {['w-[90%]', 'w-3/4', 'w-3/5'].map((w) => (
        <div key={w} className={`h-10 animate-pulse rounded-lg bg-slate-200/70 ${w}`} aria-hidden />
      ))}
    </div>
  )
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
    <div
      className="animate-fade fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-sheet max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-raised sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            aria-label="Tutup"
            className={`-mr-2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const statusStyle: Record<StockStatus, string> = {
  aman: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  menipis: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  habis: 'bg-red-50 text-red-700 ring-red-600/20',
}

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle[status]}`}>
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
      className={`group inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-slate-700 ${focusRing}`}
    >
      <span
        className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-teal-700' : 'bg-slate-300 group-hover:bg-slate-400'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(15_23_42/0.25)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${checked ? 'translate-x-4' : ''}`}
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
    <div className="inline-flex rounded-lg bg-slate-200/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-9 rounded-md px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${focusRing} ${value === o.value ? 'bg-white text-teal-800 shadow-[0_1px_2px_rgb(15_23_42/0.12)]' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

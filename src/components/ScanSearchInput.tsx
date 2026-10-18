import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Camera, Search } from 'lucide-react'
import { Button, Input } from './ui'

// zxing cukup besar; dimuat hanya saat kamera dibuka.
const CameraScanner = lazy(() => import('./CameraScanner').then((m) => ({ default: m.CameraScanner })))

export type ScanSource = 'keyboard' | 'scanner' | 'camera'

// Scanner HID (mis. Zebra DS2208) "mengetik" tiap karakter berjarak beberapa ms; ketikan manusia jauh lebih lambat.
const SCAN_GAP_MS = 50
const SCAN_MIN_LEN = 4

const isTyping = (e: globalThis.KeyboardEvent | KeyboardEvent) =>
  e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey

function isEditable(el: EventTarget | null) {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
  )
}

/** Ubah nilai input yang dikendalikan React dari luar (setter bawaan + event input agar onChange terpanggil). */
function setNativeValue(el: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Kotak cari yang juga menerima scanner HID (mengetik lalu Enter) dan tombol kamera.
 * Hasil scanner diarahkan ke kotak ini walau fokus sedang di luar input atau di kolom angka
 * (Qty/harga), agar Barcode tidak masuk ke kolom yang salah.
 * `onSubmit` dipanggil saat Enter atau saat kamera membaca Barcode.
 */
export const ScanSearchInput = forwardRef<
  HTMLInputElement,
  {
    value: string
    onChange: (v: string) => void
    onSubmit: (v: string, source: ScanSource) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
    placeholder?: string
    continuousCamera?: boolean
    autoFocus?: boolean
  }
>(function ScanSearchInput(
  { value, onChange, onSubmit, onKeyDown, placeholder, continuousCamera, autoFocus },
  ref,
) {
  const [camera, setCamera] = useState(false)
  const closeCamera = useCallback(() => setCamera(false), [])
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inputRef.current!, [])
  // Rentetan karakter cepat terakhir di kotak ini: jumlah dan waktu karakter terakhir.
  const burst = useRef({ count: 0, last: 0 })
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    // Rentetan di kolom angka lain; `before` = isi kolom sebelum rentetan, untuk dikembalikan.
    let other: { el: HTMLInputElement; before: string; keys: string; last: number } | null = null

    function redirect(keys: string, t: number) {
      inputRef.current?.focus()
      burst.current = { count: keys.length, last: t }
      onChangeRef.current(keys)
    }

    function onKey(e: globalThis.KeyboardEvent) {
      const input = inputRef.current
      if (!input || input.disabled || e.defaultPrevented || e.isComposing || !isTyping(e)) return
      if (e.target === input || document.querySelector('[aria-modal="true"]')) return

      if (!isEditable(e.target)) {
        // Spasi pada tombol yang sedang fokus tetap menekan tombol itu.
        if (e.key === ' ') return
        e.preventDefault()
        redirect(e.key, e.timeStamp)
        return
      }

      const el = e.target
      if (!(el instanceof HTMLInputElement) || el.inputMode !== 'numeric') return
      if (other?.el !== el || e.timeStamp - other.last > SCAN_GAP_MS) {
        other = { el, before: el.value, keys: e.key, last: e.timeStamp }
        return
      }
      other.keys += e.key
      other.last = e.timeStamp
      if (other.keys.length < SCAN_MIN_LEN) return
      // Terlalu cepat untuk diketik manusia: ini scanner. Kembalikan isi kolom, pindahkan ke kotak scan.
      e.preventDefault()
      setNativeValue(el, other.before)
      redirect(other.keys, e.timeStamp)
      other = null
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          className="pl-9"
          type="search"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder ?? 'Cari nama, Nomor Part, Tipe Kendaraan, atau scan Barcode'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            const b = burst.current
            if (isTyping(e)) {
              b.count = e.timeStamp - b.last <= SCAN_GAP_MS ? b.count + 1 : 1
              b.last = e.timeStamp
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const scanned = b.count >= SCAN_MIN_LEN && e.timeStamp - b.last <= SCAN_GAP_MS
              // Scan di belakang teks yang sudah diketik: ambil hasil scan-nya saja.
              const text = e.currentTarget.value
              const code = (scanned ? text.slice(-b.count) : text).trim()
              b.count = 0
              if (code) onSubmit(code, scanned ? 'scanner' : 'keyboard')
            }
            onKeyDown?.(e)
          }}
        />
      </div>
      <Button variant="secondary" onClick={() => setCamera(true)} title="Scan pakai kamera" className="shrink-0">
        <Camera size={18} />
        <span className="hidden sm:inline">Kamera</span>
      </Button>
      {camera && (
        <Suspense fallback={null}>
          <CameraScanner
            open={camera}
            onClose={closeCamera}
            continuous={continuousCamera}
            onScan={(code) => onSubmit(code, 'camera')}
          />
        </Suspense>
      )}
    </div>
  )
})

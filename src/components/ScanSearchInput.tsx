import { forwardRef, lazy, Suspense, useCallback, useState, type KeyboardEvent } from 'react'
import { Camera, Search } from 'lucide-react'
import { Button, Input } from './ui'

// zxing cukup besar; dimuat hanya saat kamera dibuka.
const CameraScanner = lazy(() => import('./CameraScanner').then((m) => ({ default: m.CameraScanner })))

/**
 * Kotak cari yang juga menerima scanner HID (mengetik lalu Enter) dan tombol kamera.
 * `onSubmit` dipanggil saat Enter atau saat kamera membaca Barcode.
 */
export const ScanSearchInput = forwardRef<
  HTMLInputElement,
  {
    value: string
    onChange: (v: string) => void
    onSubmit: (v: string, source: 'keyboard' | 'camera') => void
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
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <Input
          ref={ref}
          className="pl-9"
          type="search"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder ?? 'Cari nama, Nomor Part, Tipe Kendaraan, atau scan Barcode'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (value.trim()) onSubmit(value.trim(), 'keyboard')
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

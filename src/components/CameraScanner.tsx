import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
  type Binarizer,
  type LuminanceSource,
} from '@zxing/library'
import { useEffect, useRef, useState } from 'react'
import { ErrorBox, Modal } from './ui'

// Format di kemasan sparepart: EAN/UPC (barang retail), Code 128/39/ITF, PDF417 (label Honda AHM), QR/Data Matrix.
const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.PDF_417,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
]
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'pdf417', 'qr_code', 'data_matrix']
const SCAN_INTERVAL_MS = 120

type NativeDetector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type NativeDetectorCtor = {
  new (opts: { formats: string[] }): NativeDetector
  getSupportedFormats: () => Promise<string[]>
}

/** BarcodeDetector bawaan browser (Chrome Android) — jauh lebih cepat & akurat; dipakai jika mendukung EAN dan PDF417. */
async function nativeDetector(): Promise<NativeDetector | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector
  if (!Ctor) return null
  try {
    const supported = await Ctor.getSupportedFormats()
    if (!supported.includes('ean_13') || !supported.includes('pdf417')) return null
    return new Ctor({ formats: NATIVE_FORMATS.filter((f) => supported.includes(f)) })
  } catch {
    return null
  }
}

/**
 * Fallback zxing. Hasil decode sangat bergantung pada ukuran gambar dan binarizer
 * (mis. PDF417 Honda gagal dengan HybridBinarizer di 1280px tapi berhasil dengan Global),
 * jadi tiap frame dicoba di dua skala × dua binarizer.
 */
function zxingDecoder() {
  const reader = new MultiFormatReader()
  reader.setHints(
    new Map<DecodeHintType, unknown>([
      [DecodeHintType.TRY_HARDER, true],
      [DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS],
    ]),
  )
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const binarizers: ((s: LuminanceSource) => Binarizer)[] = [
    (s) => new HybridBinarizer(s),
    (s) => new GlobalHistogramBinarizer(s),
  ]

  function luminance(video: HTMLVideoElement, maxSide: number) {
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
    const w = Math.round(video.videoWidth * scale)
    const h = Math.round(video.videoHeight * scale)
    canvas.width = w
    canvas.height = h
    ctx.drawImage(video, 0, 0, w, h)
    const rgba = ctx.getImageData(0, 0, w, h).data
    const lum = new Uint8ClampedArray(w * h)
    for (let i = 0; i < lum.length; i++) lum[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8
    return new RGBLuminanceSource(lum, w, h)
  }

  return (video: HTMLVideoElement): string | null => {
    for (const maxSide of [1280, 720]) {
      const source = luminance(video, maxSide)
      for (const bin of binarizers) {
        try {
          return reader.decodeWithState(new BinaryBitmap(bin(source))).getText()
        } catch {
          // belum terbaca; coba kombinasi berikutnya
        } finally {
          reader.reset()
        }
      }
    }
    return null
  }
}

/**
 * Scan Barcode lewat kamera. `continuous`: tetap terbuka setelah scan
 * (dengan jeda agar satu Barcode tidak terbaca berkali-kali).
 */
export function CameraScanner({
  open,
  onClose,
  onScan,
  continuous = false,
}: {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
  continuous?: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [last, setLast] = useState('')
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const box = boxRef.current
    if (!open || !box || !('mediaDevices' in navigator)) return
    // Elemen <video> baru per percobaan: di StrictMode efek jalan dua kali, dan pembersihan
    // percobaan pertama yang telat tidak boleh mengosongkan video percobaan kedua (layar hitam).
    const video = document.createElement('video')
    video.className = 'aspect-[4/3] w-full rounded-lg bg-slate-950 object-cover'
    video.muted = true
    video.autoplay = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    box.appendChild(video)

    let cancelled = false
    let stream: MediaStream | undefined
    let timer: number | undefined
    let lastCode = ''
    let lastAt = 0

    function handle(code: string) {
      const now = Date.now()
      if (code === lastCode && now - lastAt < 1500) return false
      lastCode = code
      lastAt = now
      navigator.vibrate?.(60)
      setLast(code)
      onScanRef.current(code)
      if (!continuous) onClose()
      return !continuous
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // Fokus otomatis terus-menerus (Android); diabaikan jika tidak didukung.
            advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
          },
        })
      } catch (e) {
        if (cancelled) return
        const err = e as Error
        setError(
          err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser.'
            : `Kamera tidak bisa dibuka: ${err.message}`,
        )
        return
      }
      if (cancelled) return stream.getTracks().forEach((t) => t.stop())
      video.srcObject = stream
      await video.play().catch(() => {})

      const native = await nativeDetector()
      const zxing = native ? null : zxingDecoder()

      const tick = async () => {
        if (cancelled) return
        if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          let code: string | null = null
          if (native) {
            const found = await native.detect(video).catch(() => [])
            code = found[0]?.rawValue ?? null
          } else {
            code = zxing!(video)
          }
          if (cancelled) return
          if (code && handle(code.trim())) return
        }
        timer = window.setTimeout(tick, SCAN_INTERVAL_MS)
      }
      tick()
    }

    setError('')
    setLast('')
    start()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
      video.remove()
    }
  }, [open, continuous, onClose])

  // getUserMedia hanya tersedia di konteks aman (HTTPS / localhost).
  const message =
    'mediaDevices' in navigator
      ? error
      : 'Kamera hanya bisa dipakai lewat HTTPS atau localhost. Buka aplikasi lewat alamat HTTPS.'

  return (
    <Modal open={open} onClose={onClose} title="Scan Barcode">
      {message && <ErrorBox>{message}</ErrorBox>}
      <div ref={boxRef} className={message ? 'hidden' : 'relative'} />
      {!message && (
        <p className="mt-2 text-center text-sm text-slate-500">
          {last ? `Terbaca: ${last}` : 'Arahkan kamera ke Barcode, jaga jarak ±15-25 cm agar fokus'}
        </p>
      )}
    </Modal>
  )
}

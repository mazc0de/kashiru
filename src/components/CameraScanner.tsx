import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { Modal } from './ui'

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
    // Elemen <video> baru per percobaan: di StrictMode efek jalan dua kali, dan stop() milik
    // percobaan pertama yang telat selesai akan mengosongkan video yang dipakai percobaan kedua (layar hitam).
    const video = document.createElement('video')
    video.className = 'aspect-[4/3] w-full rounded-lg bg-black object-cover'
    video.muted = true
    video.autoplay = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    box.appendChild(video)

    let controls: IScannerControls | undefined
    let cancelled = false
    let lastCode = ''
    let lastAt = 0
    const reader = new BrowserMultiFormatReader()
    setError('')
    setLast('')
    reader
      .decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video, (result, _err, ctl) => {
        if (!result || cancelled) return
        const code = result.getText()
        const now = Date.now()
        if (code === lastCode && now - lastAt < 1500) return
        lastCode = code
        lastAt = now
        navigator.vibrate?.(60)
        setLast(code)
        onScanRef.current(code)
        if (!continuous) {
          ctl.stop()
          onClose()
        }
      })
      .then((c) => {
        if (cancelled) c.stop()
        else controls = c
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(
          e.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser.'
            : `Kamera tidak bisa dibuka: ${e.message}`,
        )
      })
    return () => {
      cancelled = true
      controls?.stop()
      video.remove()
    }
  }, [open, continuous, onClose])

  // getUserMedia hanya tersedia di konteks aman (HTTPS / localhost).
  const message = 'mediaDevices' in navigator
    ? error
    : 'Kamera hanya bisa dipakai lewat HTTPS atau localhost. Buka aplikasi lewat alamat HTTPS.'

  return (
    <Modal open={open} onClose={onClose} title="Scan Barcode">
      {message && <p className="text-sm text-red-700">{message}</p>}
      <div ref={boxRef} className={message ? 'hidden' : ''} />
      {!message && (
        <p className="mt-2 text-center text-sm text-slate-500">
          {last ? `Terbaca: ${last}` : 'Arahkan kamera ke Barcode'}
        </p>
      )}
    </Modal>
  )
}

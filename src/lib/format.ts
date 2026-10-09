import type { MovementType, PaymentMethod } from './types'

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export function rupiah(n: number) {
  return `Rp ${number.format(Math.round(n))}`
}

export function num(n: number) {
  return number.format(n)
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function longDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Tanggal hari ini (YYYY-MM-DD) di zona waktu Toko. */
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

/** Nopol: huruf besar + spasi tunggal, tanpa validasi format. */
export function normalizePlate(s: string) {
  return s.trim().replace(/\s+/g, ' ').toUpperCase()
}

export const paymentLabel: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
}

export const movementLabel: Record<MovementType, string> = {
  initial: 'Stok Awal',
  sale: 'Penjualan',
  sale_void: 'Penjualan Batal',
  receive: 'Penerimaan Barang',
  adjust: 'Penyesuaian Stok',
  opname: 'Opname',
}

export type StockStatus = 'aman' | 'menipis' | 'habis'

export function stockStatus(p: { stock: number; min_stock: number }): StockStatus {
  if (p.stock <= 0) return 'habis'
  if (p.stock <= p.min_stock) return 'menipis'
  return 'aman'
}

export type DiscountMode = 'amount' | 'percent'

/** Diskon selalu dicatat sebagai Rupiah utuh, dibatasi 0..base. */
export function discountAmount(base: number, mode: DiscountMode, value: number) {
  if (!Number.isFinite(value) || value <= 0 || base <= 0) return 0
  const raw = mode === 'percent' ? (base * Math.min(value, 100)) / 100 : value
  return Math.min(base, Math.round(raw))
}

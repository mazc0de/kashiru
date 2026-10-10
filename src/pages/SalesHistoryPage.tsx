import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, ReceiptText } from 'lucide-react'
import { Card, Input, PageHeader, Spinner, focusRing } from '../components/ui'
import { dateTime, longDate, num, paymentLabel, rupiah, todayIn } from '../lib/format'
import { useStore } from '../lib/queries'
import { supabase } from '../lib/supabase'
import type { PaymentMethod, Sale } from '../lib/types'

const LIST_COLUMNS =
  'id, receipt_no, sale_date, created_at, vehicle_plate, customer_name, total, discount, line_discount_total, payment_method, status'

type SaleRow = Pick<
  Sale,
  | 'id'
  | 'receipt_no'
  | 'sale_date'
  | 'created_at'
  | 'vehicle_plate'
  | 'customer_name'
  | 'total'
  | 'discount'
  | 'line_discount_total'
  | 'payment_method'
  | 'status'
>

export function SalesHistoryPage() {
  const store = useStore()
  const tz = store.data?.timezone ?? 'Asia/Jakarta'
  const [date, setDate] = useState(() => todayIn(tz))
  const [search, setSearch] = useState('')
  const term = search.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, ' ')

  const q = useQuery({
    queryKey: ['sales', term ? { term } : { date }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let req = supabase.from('sales').select(LIST_COLUMNS).order('created_at', { ascending: false })
      if (term) {
        req = req.or(`receipt_no.ilike.*${term}*,vehicle_plate.ilike.*${term.toUpperCase()}*`).limit(100)
      } else {
        req = req.eq('sale_date', date)
      }
      const { data, error } = await req
      if (error) throw error
      return data as SaleRow[]
    },
  })

  const rows = q.data ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <PageHeader title="Riwayat Penjualan" />
      <div className="flex flex-wrap gap-2">
        <Input type="date" className="w-auto" value={date} disabled={!!term} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <Input
          type="search"
          className="min-w-48 flex-1"
          placeholder="Cari Nomor Nota atau Nopol (semua tanggal)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!term && <DailySummary date={date} rows={rows} />}

      <Card>
        {q.isLoading ? (
          <Spinner />
        ) : q.error ? (
          <p role="alert" className="p-4 text-sm text-red-700">Gagal memuat Riwayat Penjualan.</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-slate-500">
            <ReceiptText size={28} className="text-slate-400" aria-hidden />
            Tidak ada Penjualan.
          </div>
        ) : (
          <ul>
            {rows.map((s) => (
              <li key={s.id} className="border-b border-slate-100 last:border-0">
                <Link
                  to={`/riwayat/${s.id}`}
                  className={`group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-medium">
                      {s.receipt_no}
                      {s.status === 'void' && (
                        <span className="ml-2 rounded-md bg-red-50 px-1.5 py-0.5 font-sans text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                          Batal
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {dateTime(s.created_at)}
                      {s.vehicle_plate && ` · ${s.vehicle_plate}`}
                      {s.customer_name && ` · ${s.customer_name}`}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <div className={`font-semibold ${s.status === 'void' ? 'text-slate-400 line-through' : ''}`}>
                        {rupiah(s.total)}
                      </div>
                      <div className="text-xs text-slate-500">{paymentLabel[s.payment_method]}</div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/** Ringkasan harian: Penjualan Batal tidak dihitung. */
function DailySummary({ date, rows }: { date: string; rows: SaleRow[] }) {
  const done = rows.filter((r) => r.status === 'completed')
  const byMethod: Record<PaymentMethod, number> = { cash: 0, qris: 0, transfer: 0 }
  let discount = 0
  for (const r of done) {
    byMethod[r.payment_method] += r.total
    discount += r.discount + r.line_discount_total
  }
  const omzet = byMethod.cash + byMethod.qris + byMethod.transfer
  const voided = rows.length - done.length

  return (
    <Card className="p-5">
      <div className="mb-4 text-sm font-medium text-slate-600">{longDate(date)}</div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Jumlah Penjualan" value={num(done.length)} />
        <Stat label="Omzet" value={rupiah(omzet)} strong />
        <Stat label="Total Diskon" value={rupiah(discount)} />
        <Stat label="Penjualan Batal" value={num(voided)} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg bg-slate-100/80 p-3">
        {(['cash', 'qris', 'transfer'] as const).map((m) => (
          <Stat key={m} label={paymentLabel[m]} value={rupiah(byMethod[m])} />
        ))}
      </div>
    </Card>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-0.5 tracking-tight ${strong ? 'text-2xl font-semibold text-teal-800' : 'text-lg font-semibold'}`}>{value}</div>
    </div>
  )
}

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card, Input, PageHeader, Spinner } from '../components/ui'
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
          <p className="p-4 text-sm text-red-700">Gagal memuat Riwayat Penjualan.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Tidak ada Penjualan.</p>
        ) : (
          <ul>
            {rows.map((s) => (
              <li key={s.id} className="border-b border-slate-100 last:border-0">
                <Link to={`/riwayat/${s.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-medium">
                      {s.receipt_no}
                      {s.status === 'void' && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 font-sans text-xs text-red-700">Batal</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {dateTime(s.created_at)}
                      {s.vehicle_plate && ` · ${s.vehicle_plate}`}
                      {s.customer_name && ` · ${s.customer_name}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`font-semibold ${s.status === 'void' ? 'text-slate-400 line-through' : ''}`}>
                      {rupiah(s.total)}
                    </div>
                    <div className="text-xs text-slate-500">{paymentLabel[s.payment_method]}</div>
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
    <Card className="p-4">
      <div className="mb-3 text-sm text-slate-500">{longDate(date)}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Jumlah Penjualan" value={num(done.length)} />
        <Stat label="Omzet" value={rupiah(omzet)} strong />
        <Stat label="Total Diskon" value={rupiah(discount)} />
        <Stat label="Penjualan Batal" value={num(voided)} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
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
      <div className={strong ? 'text-lg font-bold' : 'font-semibold'}>{value}</div>
    </div>
  )
}

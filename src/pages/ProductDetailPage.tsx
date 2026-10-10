import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PackageCheck, Pencil } from 'lucide-react'
import { Button, Card, PageHeader, Spinner, StockBadge } from '../components/ui'
import { dateTime, movementLabel, num, rupiah, stockStatus } from '../lib/format'
import { useCatalog } from '../lib/queries'
import { supabase } from '../lib/supabase'
import type { StockMovement } from '../lib/types'

export function ProductDetailPage() {
  const { id } = useParams()
  const catalog = useCatalog()
  const p = catalog.byId.get(id!)

  if (catalog.isLoading) return <Spinner />
  if (!p) return <p className="p-6 text-center text-slate-500">Sparepart tidak ditemukan.</p>

  return (
    <div className="space-y-4">
      <PageHeader
        title={p.name}
        actions={
          <>
            <Link to={`/penerimaan?sparepart=${p.id}`}>
              <Button variant="secondary">
                <PackageCheck size={18} />
                Penerimaan Barang
              </Button>
            </Link>
            <Link to={`/sparepart/${p.id}/ubah`}>
              <Button>
                <Pencil size={18} />
                Ubah
              </Button>
            </Link>
          </>
        }
      />
      {!p.is_active && (
        <p className="rounded-lg bg-slate-200/60 px-3 py-2.5 text-sm text-slate-700">
          Sparepart ini nonaktif. Tidak muncul di kasir dan pencarian.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="h-fit space-y-4 p-5">
          <div className="border-b border-slate-100 pb-4">
            <div className="text-sm text-slate-500">Stok</div>
            <div className="flex items-center gap-2 text-4xl font-semibold tracking-tight">
              {num(p.stock)} <span className="text-base font-normal text-slate-500">{p.unit}</span>
              <StockBadge status={stockStatus(p)} />
            </div>
            <div className="text-xs text-slate-500">Stok minimum {num(p.min_stock)}</div>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
            <Info label="Harga Jual" value={rupiah(p.sell_price)} />
            <Info label="Harga Beli Terakhir" value={rupiah(p.last_cost)} />
            <Info label="HPP" value={rupiah(p.hpp)} />
            <Info label="Nomor Part" value={p.part_number || '-'} />
            <Info label="Kategori" value={p.categoryName || '-'} />
            <Info label="Merek" value={p.brandName || '-'} />
          </dl>
          <div className="text-sm">
            <div className="text-slate-500">Tipe Kendaraan</div>
            <div>{p.vehicle_types.length ? p.vehicle_types.join(', ') : '-'}</div>
          </div>
          <div className="text-sm">
            <div className="text-slate-500">Barcode</div>
            <div className="font-mono">{p.barcodes.length ? p.barcodes.join(', ') : '-'}</div>
          </div>
        </Card>
        <StockCard productId={p.id} unit={p.unit} />
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

const STEP = 50

function StockCard({ productId, unit }: { productId: string; unit: string }) {
  const [limit, setLimit] = useState(STEP)
  const q = useQuery({
    queryKey: ['movements', productId, limit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id, product_id, type, qty_change, qty_after, unit_cost, ref_id, note, created_at, profiles(display_name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1)
      if (error) throw error
      const rows = data as unknown as StockMovement[]
      // Nomor Nota untuk Mutasi Stok dari Penjualan.
      const saleIds = [...new Set(rows.filter((r) => r.type === 'sale' || r.type === 'sale_void').map((r) => r.ref_id!))]
      const receipts = new Map<string, string>()
      if (saleIds.length) {
        const { data: sales } = await supabase.from('sales').select('id, receipt_no').in('id', saleIds)
        for (const s of sales ?? []) receipts.set(s.id, s.receipt_no)
      }
      return { rows: rows.slice(0, limit), more: rows.length > limit, receipts }
    },
  })

  return (
    <Card>
      <h2 className="border-b border-slate-100 px-4 py-3.5 font-semibold tracking-tight">Kartu Stok</h2>
      {q.isLoading ? (
        <Spinner />
      ) : q.error ? (
        <p className="p-4 text-sm text-red-700">Gagal memuat Kartu Stok.</p>
      ) : (
        <>
          <ul>
            {q.data!.rows.map((m) => {
              const receipt = m.ref_id ? q.data!.receipts.get(m.ref_id) : undefined
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">
                      {movementLabel[m.type]}
                      {receipt && (
                        <Link to={`/riwayat/${m.ref_id}`} className="ml-2 font-mono text-xs text-teal-700 underline-offset-2 hover:underline">
                          {receipt}
                        </Link>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {dateTime(m.created_at)} · {m.profiles?.display_name ?? '-'}
                      {m.unit_cost !== null && m.type !== 'sale' && ` · @ ${rupiah(m.unit_cost)}`}
                    </div>
                    {m.note && m.type !== 'initial' && <div className="text-xs text-slate-600">{m.note}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`font-semibold ${m.qty_change < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {m.qty_change > 0 ? '+' : ''}
                      {num(m.qty_change)}
                    </div>
                    <div className="text-xs text-slate-500">
                      sisa {num(m.qty_after)} {unit}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {q.data!.more && (
            <div className="p-3 text-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + STEP)} disabled={q.isFetching}>
                Muat lebih banyak
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

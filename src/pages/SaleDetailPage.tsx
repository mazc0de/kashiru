import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Ban, Printer } from 'lucide-react'
import { PrintReceipt } from '../components/Receipt'
import { Button, Card, ErrorBox, Field, Modal, PageHeader, Spinner, Textarea } from '../components/ui'
import { errorText } from '../lib/errors'
import { dateTime, num, paymentLabel, rupiah } from '../lib/format'
import { useOnline } from '../lib/online'
import { useStore } from '../lib/queries'
import { fetchSale } from '../lib/sales'
import { supabase } from '../lib/supabase'

export function SaleDetailPage() {
  const { id } = useParams()
  const store = useStore()
  const online = useOnline()
  const qc = useQueryClient()
  const [printKey, setPrintKey] = useState(0)
  const [voidOpen, setVoidOpen] = useState(false)
  const [reason, setReason] = useState('')

  const q = useQuery({ queryKey: ['sale', id], queryFn: () => fetchSale(id!) })

  const voidSale = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('void_sale', { p_sale_id: id, p_reason: reason })
      if (error) throw error
    },
    onSuccess: () => {
      setVoidOpen(false)
      setReason('')
      qc.invalidateQueries({ queryKey: ['sale', id] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
  })

  if (q.isLoading) return <Spinner />
  if (!q.data) return <p className="p-6 text-center text-slate-500">Penjualan tidak ditemukan.</p>
  const s = q.data
  const items = [...s.sale_items].sort((a, b) => a.line_no - b.line_no)

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader
        title={s.receipt_no}
        actions={
          <>
            <Button variant="secondary" disabled={!store.data} onClick={() => setPrintKey((k) => k + 1)}>
              <Printer size={18} />
              Cetak Ulang
            </Button>
            {s.status === 'completed' && (
              <Button variant="danger" disabled={!online} onClick={() => setVoidOpen(true)}>
                <Ban size={18} />
                Batalkan
              </Button>
            )}
          </>
        }
      />

      {s.status === 'void' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <b>Penjualan Batal</b> — {s.void_reason}
          <div className="text-xs">
            {s.voided_at && dateTime(s.voided_at)} oleh {s.voider?.display_name ?? '-'}. Stok sudah dikembalikan; tidak
            dihitung sebagai omzet.
          </div>
        </div>
      )}

      <Card className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3">
        <Info label="Waktu" value={dateTime(s.created_at)} />
        <Info label="Kasir" value={s.cashier?.display_name ?? '-'} />
        <Info label="Mekanik" value={s.mechanic?.name ?? '-'} />
        <Info label="Nopol" value={s.vehicle_plate || '-'} />
        <Info label="Nama Pelanggan" value={s.customer_name || '-'} />
        <Info label="Metode Bayar" value={paymentLabel[s.payment_method]} />
      </Card>

      <Card>
        <ul>
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0">
              <div className="min-w-0 text-sm">
                <div className="font-medium">
                  {it.kind === 'service' && (
                    <span className="mr-1 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Jasa</span>
                  )}
                  {it.name}
                </div>
                <div className="text-xs text-slate-500">
                  {it.part_number && `${it.part_number} · `}
                  {num(it.qty)} {it.unit} × {rupiah(it.price)}
                  {it.discount > 0 && ` · diskon ${rupiah(it.discount)}`}
                </div>
              </div>
              <div className="shrink-0 font-semibold">{rupiah(it.line_total)}</div>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-slate-200 p-4 text-sm">
          <Row label="Subtotal" value={rupiah(s.subtotal)} />
          {s.line_discount_total > 0 && <Row label="Diskon baris" value={`−${rupiah(s.line_discount_total)}`} />}
          {s.discount > 0 && <Row label="Diskon Penjualan" value={`−${rupiah(s.discount)}`} />}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{rupiah(s.total)}</span>
          </div>
          <Row label={paymentLabel[s.payment_method]} value={rupiah(s.paid)} />
          {s.payment_method === 'cash' && <Row label="Kembalian" value={rupiah(s.change)} />}
        </div>
      </Card>

      <Modal open={voidOpen} onClose={() => setVoidOpen(false)} title={`Batalkan ${s.receipt_no}?`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            voidSale.mutate()
          }}
        >
          <p className="text-sm text-slate-600">
            Stok Sparepart dikembalikan dan Penjualan tidak dihitung sebagai omzet. Nomor Nota tetap terpakai. Untuk
            koreksi, buat Penjualan baru setelah ini.
          </p>
          <Field label="Alasan pembatalan">
            <Textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {voidSale.error && <ErrorBox>{errorText(voidSale.error)}</ErrorBox>}
          <Button type="submit" variant="danger" className="w-full" disabled={!reason.trim() || voidSale.isPending || !online}>
            {voidSale.isPending ? 'Membatalkan…' : 'Batalkan Penjualan'}
          </Button>
        </form>
      </Modal>

      {printKey > 0 && store.data && <PrintReceipt sale={s} store={store.data} reprint printKey={printKey} />}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

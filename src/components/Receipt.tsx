import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { dateTime, num, paymentLabel } from '../lib/format'
import type { SaleWithDetails, Store } from '../lib/types'

/** Isi Nota untuk printer thermal 58/80 mm. */
export function Receipt({ sale, store, reprint }: { sale: SaleWithDetails; store: Store; reprint?: boolean }) {
  const items = [...sale.sale_items].sort((a, b) => a.line_no - b.line_no)
  return (
    <div className="receipt" style={{ width: store.paper_width === 80 ? '72mm' : '48mm' }}>
      <div className="center bold big">{store.name}</div>
      {store.address && <div className="center">{store.address}</div>}
      {store.phone && <div className="center">{store.phone}</div>}
      {reprint && <div className="center bold">*** CETAK ULANG ***</div>}
      {sale.status === 'void' && <div className="center bold">*** BATAL ***</div>}
      <hr />
      <div>{sale.receipt_no}</div>
      <div>{dateTime(sale.created_at)}</div>
      <div>Kasir: {sale.cashier?.display_name ?? '-'}</div>
      {sale.mechanic && <div>Mekanik: {sale.mechanic.name}</div>}
      {sale.vehicle_plate && <div>Nopol: {sale.vehicle_plate}</div>}
      {sale.customer_name && <div>Pelanggan: {sale.customer_name}</div>}
      <hr />
      {items.map((it) => (
        <div key={it.id} className="item">
          <div>{it.name}</div>
          {it.part_number && <div className="muted">{it.part_number}</div>}
          <div className="row">
            <span>
              {num(it.qty)} x {num(it.price)}
            </span>
            <span>{num(it.qty * it.price)}</span>
          </div>
          {it.discount > 0 && (
            <div className="row">
              <span>  Diskon</span>
              <span>-{num(it.discount)}</span>
            </div>
          )}
        </div>
      ))}
      <hr />
      <div className="row">
        <span>Subtotal</span>
        <span>{num(sale.subtotal - sale.line_discount_total)}</span>
      </div>
      {sale.discount > 0 && (
        <div className="row">
          <span>Diskon</span>
          <span>-{num(sale.discount)}</span>
        </div>
      )}
      <div className="row bold big">
        <span>TOTAL</span>
        <span>{num(sale.total)}</span>
      </div>
      <div className="row">
        <span>{paymentLabel[sale.payment_method]}</span>
        <span>{num(sale.paid)}</span>
      </div>
      {sale.payment_method === 'cash' && (
        <div className="row">
          <span>Kembali</span>
          <span>{num(sale.change)}</span>
        </div>
      )}
      <hr />
      {store.receipt_footer && <div className="center pre">{store.receipt_footer}</div>}
      <div className="center">Terima kasih</div>
    </div>
  )
}

/**
 * Merender Nota ke #print-root lalu membuka dialog print.
 * Ganti `printKey` untuk mencetak lagi.
 */
export function PrintReceipt({
  sale,
  store,
  reprint,
  printKey,
  onDone,
}: {
  sale: SaleWithDetails
  store: Store
  reprint?: boolean
  printKey: number
  onDone?: () => void
}) {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@page { size: ${store.paper_width}mm auto; margin: 0 }`
    document.head.appendChild(style)
    const t = window.setTimeout(() => {
      window.print()
      onDone?.()
    }, 100)
    return () => {
      window.clearTimeout(t)
      style.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printKey])

  return createPortal(<Receipt sale={sale} store={store} reprint={reprint} />, document.getElementById('print-root')!)
}

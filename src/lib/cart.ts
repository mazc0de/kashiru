import { useEffect, useState } from 'react'
import { discountAmount, type DiscountMode } from './format'
import type { PaymentMethod } from './types'

interface LineBase {
  key: string
  qty: number
  discMode: DiscountMode
  discValue: number
}

export interface PartLine extends LineBase {
  kind: 'part'
  productId: string
}

export interface ServiceLine extends LineBase {
  kind: 'service'
  name: string
  price: number
}

export type CartLine = PartLine | ServiceLine

export interface Cart {
  /** UUID klien untuk idempotensi create_sale; diganti setelah Penjualan tersimpan. */
  clientId: string
  lines: CartLine[]
  discMode: DiscountMode
  discValue: number
  plate: string
  customer: string
  mechanicId: string
  method: PaymentMethod
  paid: number
}

export function emptyCart(): Cart {
  return {
    clientId: crypto.randomUUID(),
    lines: [],
    discMode: 'amount',
    discValue: 0,
    plate: '',
    customer: '',
    mechanicId: '',
    method: 'cash',
    paid: 0,
  }
}

/** Keranjang dipersist di localStorage agar tahan refresh / koneksi putus. */
export function usePersistentCart(storeId: string) {
  const key = `kashiru.cart.${storeId}`
  const [cart, setCart] = useState<Cart>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return { ...emptyCart(), ...JSON.parse(raw) }
    } catch {
      /* abaikan */
    }
    return emptyCart()
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(cart))
  }, [key, cart])
  return [cart, setCart] as const
}

export interface CartTotals {
  subtotal: number
  lineDiscount: number
  afterLine: number
  saleDiscount: number
  total: number
  lineAmounts: Map<string, { gross: number; discount: number; net: number }>
}

export function computeTotals(cart: Cart, priceOf: (productId: string) => number): CartTotals {
  const lineAmounts = new Map<string, { gross: number; discount: number; net: number }>()
  let subtotal = 0
  let lineDiscount = 0
  for (const l of cart.lines) {
    const price = l.kind === 'part' ? priceOf(l.productId) : l.price
    const gross = price * l.qty
    const discount = discountAmount(gross, l.discMode, l.discValue)
    lineAmounts.set(l.key, { gross, discount, net: gross - discount })
    subtotal += gross
    lineDiscount += discount
  }
  const afterLine = subtotal - lineDiscount
  const saleDiscount = discountAmount(afterLine, cart.discMode, cart.discValue)
  return { subtotal, lineDiscount, afterLine, saleDiscount, total: afterLine - saleDiscount, lineAmounts }
}

import { supabase } from './supabase'
import type { SaleWithDetails } from './types'

export const SALE_DETAIL_SELECT =
  '*, sale_items(*), cashier:profiles!sales_cashier_id_fkey(display_name), voider:profiles!sales_voided_by_fkey(display_name), mechanic:mechanics(name)'

export async function fetchSale(id: string) {
  const { data, error } = await supabase.from('sales').select(SALE_DETAIL_SELECT).eq('id', id).single()
  if (error) throw error
  const sale = data as SaleWithDetails
  sale.sale_items = sale.sale_items.map((i) => ({ ...i, hpp: i.hpp === null ? null : Number(i.hpp) }))
  return sale
}

// Tipe baris database, ditulis manual dari supabase/migrations/*.sql.

export type PaperWidth = 58 | 80
export type PaymentMethod = 'cash' | 'qris' | 'transfer'
export type MovementType = 'initial' | 'sale' | 'sale_void' | 'receive' | 'adjust' | 'opname'

export interface Store {
  id: string
  name: string
  code: string
  address: string
  phone: string
  paper_width: PaperWidth
  receipt_footer: string
  timezone: string
  created_at: string
}

export interface Profile {
  user_id: string
  store_id: string
  display_name: string
  email: string
  is_active: boolean
  created_at: string
}

export interface NamedItem {
  id: string
  store_id: string
  name: string
  created_at: string
}

export interface Mechanic extends NamedItem {
  is_active: boolean
}

export interface Product {
  id: string
  name: string
  part_number: string
  category_id: string | null
  brand_id: string | null
  unit: string
  vehicle_types: string[]
  sell_price: number
  last_cost: number
  hpp: number
  min_stock: number
  stock: number
  is_active: boolean
  barcodes: string[]
}

export interface StockMovement {
  id: string
  product_id: string
  type: MovementType
  qty_change: number
  qty_after: number
  unit_cost: number | null
  ref_id: string | null
  note: string
  created_at: string
  profiles: { display_name: string } | null
}

export interface Sale {
  id: string
  store_id: string
  client_id: string
  receipt_no: string
  sale_date: string
  cashier_id: string
  mechanic_id: string | null
  vehicle_plate: string
  customer_name: string
  subtotal: number
  line_discount_total: number
  discount: number
  total: number
  payment_method: PaymentMethod
  paid: number
  change: number
  status: 'completed' | 'void'
  void_reason: string | null
  voided_by: string | null
  voided_at: string | null
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  line_no: number
  kind: 'part' | 'service'
  product_id: string | null
  name: string
  part_number: string
  unit: string
  qty: number
  price: number
  discount: number
  line_total: number
  hpp: number | null
}

export interface SaleWithDetails extends Sale {
  sale_items: SaleItem[]
  cashier: { display_name: string } | null
  voider: { display_name: string } | null
  mechanic: { name: string } | null
}

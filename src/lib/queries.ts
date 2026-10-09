import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useMyProfile } from './auth'
import { supabase } from './supabase'
import type { Mechanic, NamedItem, Product, Profile, Store } from './types'

const PAGE = 1000

type ProductRow = Omit<Product, 'barcodes' | 'hpp'> & {
  hpp: number | string
  product_barcodes: { barcode: string }[]
}

/** Semua Sparepart Toko (aktif & nonaktif) beserta Barcode; dicache di browser. */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const all: Product[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, name, part_number, category_id, brand_id, unit, vehicle_types, sell_price, last_cost, hpp, min_stock, stock, is_active, product_barcodes(barcode)',
          )
          .order('name')
          .order('id')
          .range(from, from + PAGE - 1)
        if (error) throw error
        for (const r of data as ProductRow[]) {
          const { product_barcodes, ...rest } = r
          all.push({ ...rest, hpp: Number(r.hpp), barcodes: product_barcodes.map((b) => b.barcode) })
        }
        if (data.length < PAGE) break
      }
      return all
    },
  })
}

function useNamedList<T extends NamedItem>(table: 'categories' | 'brands' | 'mechanics') {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order('name')
      if (error) throw error
      return data as T[]
    },
  })
}

export const useCategories = () => useNamedList<NamedItem>('categories')
export const useBrands = () => useNamedList<NamedItem>('brands')
export const useMechanics = () => useNamedList<Mechanic>('mechanics')

export function useStore() {
  const profile = useMyProfile()
  const storeId = profile.data?.store_id
  return useQuery({
    queryKey: ['store', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('*').eq('id', storeId!).single()
      if (error) throw error
      return data as Store
    },
  })
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('display_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export interface CatalogEntry extends Product {
  categoryName: string
  brandName: string
  haystack: string
}

/** Sparepart + nama Kategori/Merek + indeks pencarian & Barcode. */
export function useCatalog() {
  const products = useProducts()
  const categories = useCategories()
  const brands = useBrands()

  const value = useMemo(() => {
    const catName = new Map((categories.data ?? []).map((c) => [c.id, c.name]))
    const brandName = new Map((brands.data ?? []).map((b) => [b.id, b.name]))
    const entries: CatalogEntry[] = (products.data ?? []).map((p) => {
      const categoryName = (p.category_id && catName.get(p.category_id)) || ''
      const brandNm = (p.brand_id && brandName.get(p.brand_id)) || ''
      return {
        ...p,
        categoryName,
        brandName: brandNm,
        haystack: [p.name, p.part_number, ...p.vehicle_types, brandNm, categoryName, ...p.barcodes]
          .join(' ')
          .toLowerCase(),
      }
    })
    const byId = new Map(entries.map((e) => [e.id, e]))
    const byBarcode = new Map<string, CatalogEntry>()
    for (const e of entries) for (const b of e.barcodes) byBarcode.set(b, e)
    // Label Honda (PDF417) berisi Nomor Part, mis. "43130-KZL-930". Hanya dipakai bila Nomor Part unik.
    const byPartNumber = new Map<string, CatalogEntry | null>()
    for (const e of entries) {
      const k = partKey(e.part_number)
      if (k) byPartNumber.set(k, byPartNumber.has(k) ? null : e)
    }
    /** Cari Sparepart dari hasil scan: Barcode terdaftar dulu, lalu Nomor Part. */
    const findByCode = (code: string) => byBarcode.get(code) ?? byPartNumber.get(partKey(code)) ?? undefined
    return { entries, byId, byBarcode, findByCode }
  }, [products.data, categories.data, brands.data])

  return { ...value, isLoading: products.isLoading, error: products.error }
}

/** Nomor Part dinormalkan: huruf besar, tanpa spasi/tanda hubung. */
function partKey(s: string) {
  return s.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

/** Cari lewat nama, Nomor Part, Tipe Kendaraan, Merek, Kategori, dan Barcode sekaligus. */
export function searchCatalog(entries: CatalogEntry[], query: string, limit = 50) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const out: CatalogEntry[] = []
  for (const e of entries) {
    if (tokens.every((t) => e.haystack.includes(t))) {
      out.push(e)
      if (out.length >= limit) break
    }
  }
  return out
}

/** Input yang tampak seperti hasil scan Barcode (tanpa spasi, angka panjang). */
export function looksLikeBarcode(s: string) {
  return /^\d{6,}$/.test(s.trim())
}

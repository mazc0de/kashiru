import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, PackagePlus, PackageSearch, Plus } from 'lucide-react'
import { ScanSearchInput } from '../components/ScanSearchInput'
import { Select } from '../components/Select'
import { Button, Card, PageHeader, Spinner, StockBadge, focusRing } from '../components/ui'
import { num, rupiah, stockStatus, type StockStatus } from '../lib/format'
import { looksLikeBarcode, searchCatalog, useBrands, useCatalog, useCategories } from '../lib/queries'

const PAGE = 100

export function StockPage() {
  const catalog = useCatalog()
  const categories = useCategories()
  const brands = useBrands()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StockStatus | ''>('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [unknownBarcode, setUnknownBarcode] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const base = useMemo(
    () =>
      catalog.entries.filter(
        (e) =>
          (showInactive || e.is_active) &&
          (!categoryId || e.category_id === categoryId) &&
          (!brandId || e.brand_id === brandId),
      ),
    [catalog.entries, showInactive, categoryId, brandId],
  )
  const searched = useMemo(() => (query.trim() ? searchCatalog(base, query, 500) : base), [base, query])
  const counts = useMemo(() => {
    const c = { aman: 0, menipis: 0, habis: 0 }
    for (const e of searched) c[stockStatus(e)]++
    return c
  }, [searched])
  const rows = status ? searched.filter((e) => stockStatus(e) === status) : searched

  function onSubmit(value: string, source: 'keyboard' | 'camera') {
    setUnknownBarcode('')
    const hit = catalog.findByCode(value)
    if (hit) return navigate(`/stok/${hit.id}`)
    if (source === 'camera' || looksLikeBarcode(value)) {
      setUnknownBarcode(value)
      setQuery('')
    } else if (rows.length === 1) {
      navigate(`/stok/${rows[0].id}`)
    }
  }

  if (catalog.isLoading) return <Spinner label="Memuat data Sparepart…" />

  return (
    <div>
      <PageHeader
        title="Cek Stok"
        actions={
          <Link to="/sparepart/baru">
            <Button>
              <Plus size={18} />
              Sparepart
            </Button>
          </Link>
        }
      />
      <div className="space-y-3">
        <ScanSearchInput
          autoFocus
          value={query}
          onChange={(v) => {
            setQuery(v)
            setUnknownBarcode('')
            setLimit(PAGE)
          }}
          onSubmit={onSubmit}
        />
        {unknownBarcode && (
          <div className="animate-flash flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>
              Barcode <b>{unknownBarcode}</b> belum terdaftar.
            </span>
            <Link to={`/sparepart/baru?barcode=${encodeURIComponent(unknownBarcode)}`}>
              <Button variant="secondary">
                <PackagePlus size={18} />
                Daftarkan Sparepart baru
              </Button>
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['', `Semua (${searched.length})`],
              ['aman', `Aman (${counts.aman})`],
              ['menipis', `Menipis (${counts.menipis})`],
              ['habis', `Habis (${counts.habis})`],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setStatus(v)}
              aria-pressed={status === v}
              className={`min-h-10 rounded-lg px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 active:scale-[0.98] ${focusRing} ${status === v ? 'bg-teal-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]' : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:ring-slate-400'}`}
            >
              {label}
            </button>
          ))}
          <Select
            className="min-w-44"
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Kategori"
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            className="min-w-44"
            value={brandId}
            onChange={setBrandId}
            placeholder="Merek"
            options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
          />
          <label className="flex min-h-10 items-center gap-2 px-1 text-sm text-slate-600">
            <input type="checkbox" className="size-4 accent-teal-700" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Tampilkan nonaktif
          </label>
        </div>

        <Card>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-slate-500">
              <PackageSearch size={28} className="text-slate-400" aria-hidden />
              {catalog.entries.length === 0 ? 'Belum ada Sparepart. Tambahkan lewat tombol + Sparepart.' : 'Tidak ada yang cocok.'}
            </div>
          ) : (
            <ul>
              {rows.slice(0, limit).map((p) => (
                <li key={p.id} className="border-b border-slate-100 last:border-0">
                  <Link
                    to={`/stok/${p.id}`}
                    className={`group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {p.name}
                        {!p.is_active && <span className="ml-2 text-xs font-normal text-slate-500">(nonaktif)</span>}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {[p.part_number, p.brandName, p.categoryName, p.vehicle_types.join(', ')].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold">
                          {num(p.stock)} <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                          {rupiah(p.sell_price)} <StockBadge status={stockStatus(p)} />
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" aria-hidden />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {rows.length > limit && (
            <div className="p-3 text-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                Tampilkan lebih banyak ({rows.length - limit} lagi)
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

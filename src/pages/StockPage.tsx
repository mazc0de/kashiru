import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PackagePlus, Plus } from 'lucide-react'
import { ScanSearchInput } from '../components/ScanSearchInput'
import { Select } from '../components/Select'
import { Button, Card, PageHeader, Spinner, StockBadge } from '../components/ui'
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
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
              className={`min-h-10 rounded-full border px-3 text-sm ${status === v ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
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
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Tampilkan nonaktif
          </label>
        </div>

        <Card>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              {catalog.entries.length === 0 ? 'Belum ada Sparepart. Tambahkan lewat tombol + Sparepart.' : 'Tidak ada yang cocok.'}
            </p>
          ) : (
            <ul>
              {rows.slice(0, limit).map((p) => (
                <li key={p.id} className="border-b border-slate-100 last:border-0">
                  <Link to={`/stok/${p.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {p.name}
                        {!p.is_active && <span className="ml-2 text-xs text-slate-400">(nonaktif)</span>}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {[p.part_number, p.brandName, p.categoryName, p.vehicle_types.join(', ')].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold">
                        {num(p.stock)} <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                        {rupiah(p.sell_price)} <StockBadge status={stockStatus(p)} />
                      </div>
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

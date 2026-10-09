import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PackagePlus, Save, Trash2 } from 'lucide-react'
import { ScanSearchInput } from '../components/ScanSearchInput'
import { Button, Card, ErrorBox, Field, Input, NumberInput, PageHeader, Spinner, WarnBox } from '../components/ui'
import { errorText } from '../lib/errors'
import { num, rupiah } from '../lib/format'
import { useOnline } from '../lib/online'
import { looksLikeBarcode, searchCatalog, useCatalog, type CatalogEntry } from '../lib/queries'
import { supabase } from '../lib/supabase'

interface Line {
  productId: string
  qty: number
  unitCost: number
}

export function ReceivingPage() {
  const catalog = useCatalog()
  const online = useOnline()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [lines, setLines] = useState<Line[]>([])
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const [unknownBarcode, setUnknownBarcode] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  const results = useMemo(
    () => searchCatalog(catalog.entries.filter((e) => e.is_active), query, 20),
    [catalog.entries, query],
  )

  function add(p: CatalogEntry) {
    setDone('')
    setUnknownBarcode('')
    setLines((ls) =>
      ls.some((l) => l.productId === p.id)
        ? ls.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l))
        : [...ls, { productId: p.id, qty: 1, unitCost: p.last_cost }],
    )
    setQuery('')
  }

  // Dari halaman detail: /penerimaan?sparepart=<id>
  const preset = params.get('sparepart')
  useEffect(() => {
    if (!preset || catalog.isLoading) return
    const p = catalog.byId.get(preset)
    if (p) add(p)
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, catalog.isLoading])

  function onSubmit(value: string, source: 'keyboard' | 'camera') {
    const hit = catalog.byBarcode.get(value)
    if (hit) return add(hit)
    if (source === 'camera' || (looksLikeBarcode(value) && results.length === 0)) {
      setUnknownBarcode(value)
      setQuery('')
    } else if (results[0]) {
      add(results[0])
    }
  }

  async function save() {
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('receive_stock', {
      p_items: lines.map((l) => ({ product_id: l.productId, qty: l.qty, unit_cost: l.unitCost })),
      p_note: note,
    })
    setBusy(false)
    if (error) return setError(errorText(error))
    const count = lines.length
    setLines([])
    setNote('')
    setDone(`Penerimaan ${count} Sparepart tersimpan. Stok, Harga Beli Terakhir, dan HPP sudah diperbarui.`)
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['movements'] })
  }

  if (catalog.isLoading) return <Spinner />

  const total = lines.reduce((s, l) => s + l.qty * l.unitCost, 0)
  const valid = lines.length > 0 && lines.every((l) => l.qty > 0)

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader title="Penerimaan Barang" />
      <div className="relative">
        <ScanSearchInput autoFocus value={query} onChange={setQuery} onSubmit={onSubmit} />
        {query.trim() && (
          <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {results.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">Tidak ada Sparepart yang cocok.</p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  className="flex w-full justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50"
                >
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-xs text-slate-500">{p.part_number}</span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-500">
                    Stok {num(p.stock)} {p.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

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
      {done && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</div>}

      <Card>
        {lines.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Scan atau cari Sparepart yang datang dari supplier.</p>
        ) : (
          <ul>
            {lines.map((l) => {
              const p = catalog.byId.get(l.productId)!
              const set = (patch: Partial<Line>) =>
                setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, ...patch } : x)))
              return (
                <li key={l.productId} className="space-y-2 border-b border-slate-100 p-3 last:border-0">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        Stok sekarang {num(p.stock)} {p.unit} · Harga Beli Terakhir {rupiah(p.last_cost)} · Harga Jual{' '}
                        {rupiah(p.sell_price)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))}
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Field label={`Jumlah (${p.unit})`}>
                      <NumberInput value={l.qty} onChange={(n) => set({ qty: n })} />
                    </Field>
                    <Field label="Harga beli / unit">
                      <NumberInput value={l.unitCost} onChange={(n) => set({ unitCost: n })} />
                    </Field>
                    <div className="hidden text-right sm:block">
                      <div className="text-sm text-slate-500">Subtotal</div>
                      <div className="font-semibold">{rupiah(l.qty * l.unitCost)}</div>
                    </div>
                  </div>
                  {l.unitCost > 0 && p.sell_price <= l.unitCost && (
                    <WarnBox>Harga beli ini tidak lebih rendah dari Harga Jual ({rupiah(p.sell_price)}). Perbarui Harga Jual?</WarnBox>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {lines.length > 0 && (
        <Card className="space-y-3 p-3">
          <Field label="Catatan (opsional)">
            <Input value={note} placeholder="Supplier, nomor faktur…" onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex justify-between font-semibold">
            <span>Total pembelian</span>
            <span>{rupiah(total)}</span>
          </div>
          <ErrorBox>{error}</ErrorBox>
          <Button className="w-full" disabled={!valid || busy || !online} onClick={save}>
            <Save size={18} />
            {busy ? 'Menyimpan…' : !online ? 'Offline — tidak bisa simpan' : 'Simpan Penerimaan'}
          </Button>
        </Card>
      )}
    </div>
  )
}

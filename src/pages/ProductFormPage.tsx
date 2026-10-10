import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Save, Trash2, X } from 'lucide-react'
import { CreatableSelect } from '../components/Select'
import { ScanSearchInput } from '../components/ScanSearchInput'
import { TagInput } from '../components/TagInput'
import { Button, Card, ErrorBox, Field, Input, NumberInput, PageHeader, Spinner, WarnBox } from '../components/ui'
import { errorText } from '../lib/errors'
import { rupiah } from '../lib/format'
import { useOnline } from '../lib/online'
import { useBrands, useCatalog, useCategories, type CatalogEntry } from '../lib/queries'
import { supabase } from '../lib/supabase'

const UNITS = ['pcs', 'set', 'pasang', 'botol', 'liter', 'ml', 'meter', 'lembar', 'kaleng', 'dus']

export function ProductFormPage() {
  const { id } = useParams()
  const catalog = useCatalog()
  if (catalog.isLoading) return <Spinner />
  const existing = id ? catalog.byId.get(id) : undefined
  if (id && !existing) return <p className="p-6 text-center text-slate-500">Sparepart tidak ditemukan.</p>
  return <ProductForm key={id ?? 'new'} existing={existing} />
}

function ProductForm({ existing }: { existing?: CatalogEntry }) {
  const isNew = !existing
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const online = useOnline()
  const catalog = useCatalog()
  const categories = useCategories()
  const brands = useBrands()

  const [name, setName] = useState(existing?.name ?? '')
  const [partNumber, setPartNumber] = useState(existing?.part_number ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null)
  const [brandId, setBrandId] = useState<string | null>(existing?.brand_id ?? null)
  const [unit, setUnit] = useState<string | null>(existing?.unit ?? null)
  const [vehicles, setVehicles] = useState<string[]>(existing?.vehicle_types ?? [])
  const [sellPrice, setSellPrice] = useState(existing?.sell_price ?? 0)
  const [minStock, setMinStock] = useState(existing?.min_stock ?? 0)
  const [isActive, setIsActive] = useState(existing?.is_active ?? true)
  const [barcodes, setBarcodes] = useState<string[]>(
    existing?.barcodes ?? (params.get('barcode') ? [params.get('barcode')!] : []),
  )
  const [barcodeText, setBarcodeText] = useState('')
  const [barcodeError, setBarcodeError] = useState<{ text: string; productId?: string } | null>(null)
  const [initialStock, setInitialStock] = useState(0)
  const [initialCost, setInitialCost] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const vehicleSuggestions = useMemo(
    () => [...new Set(catalog.entries.flatMap((e) => e.vehicle_types))].sort((a, b) => a.localeCompare(b)),
    [catalog.entries],
  )
  const samePartNumber = partNumber.trim()
    ? catalog.entries.filter(
        (e) => e.id !== existing?.id && e.part_number.toLowerCase() === partNumber.trim().toLowerCase(),
      )
    : []
  const costRef = isNew ? initialCost : existing.last_cost

  function addBarcode(raw: string) {
    const code = raw.trim()
    setBarcodeText('')
    setBarcodeError(null)
    if (!code || barcodes.includes(code)) return
    const owner = catalog.byBarcode.get(code)
    if (owner && owner.id !== existing?.id) {
      setBarcodeError({ text: `Barcode ${code} sudah dipakai “${owner.name}”.`, productId: owner.id })
      return
    }
    setBarcodes((b) => [...b, code])
  }

  async function createNamed(table: 'categories' | 'brands', newName: string) {
    const { data, error } = await supabase.from(table).insert({ name: newName }).select('id').single()
    if (error) throw new Error(errorText(error))
    await qc.invalidateQueries({ queryKey: [table] })
    return data.id as string
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!unit) return setError('Satuan wajib dipilih.')
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('save_product', {
      p_id: existing?.id ?? null,
      p_data: {
        name,
        part_number: partNumber,
        category_id: categoryId,
        brand_id: brandId,
        unit,
        vehicle_types: vehicles,
        sell_price: sellPrice,
        min_stock: minStock,
        is_active: isActive,
        barcodes,
        initial_stock: initialStock,
        initial_cost: initialCost,
      },
    })
    if (error) {
      setBusy(false)
      return setError(errorText(error))
    }
    await qc.invalidateQueries({ queryKey: ['products'] })
    navigate(`/stok/${data}`, { replace: true })
  }

  async function remove() {
    if (!existing || !confirm(`Hapus permanen “${existing.name}”?`)) return
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('delete_product', { p_id: existing.id })
    if (error) {
      setBusy(false)
      return setError(errorText(error))
    }
    await qc.invalidateQueries({ queryKey: ['products'] })
    navigate('/stok', { replace: true })
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={isNew ? 'Sparepart baru' : `Ubah ${existing.name}`} />

      <Card className="space-y-4 p-5">
        <Field label="Nama Sparepart">
          <Input required autoFocus={isNew} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Nomor Part" hint="Kode pabrikan di kemasan (opsional)">
          <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
        </Field>
        {samePartNumber.length > 0 && (
          <WarnBox>
            Nomor Part ini juga dipakai: {samePartNumber.map((s) => s.name).join(', ')}. Boleh (mis. part aftermarket),
            pastikan bukan data ganda.
          </WarnBox>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kategori">
            <CreatableSelect
              value={categoryId}
              options={categories.data ?? []}
              onChange={setCategoryId}
              onCreate={(n) => createNamed('categories', n)}
            />
          </Field>
          <Field label="Merek">
            <CreatableSelect
              value={brandId}
              options={brands.data ?? []}
              onChange={setBrandId}
              onCreate={(n) => createNamed('brands', n)}
            />
          </Field>
        </div>
        <Field label="Tipe Kendaraan" hint="Ketik lalu Enter; bisa lebih dari satu">
          <TagInput value={vehicles} onChange={setVehicles} suggestions={vehicleSuggestions} placeholder="Beat, Vario 125…" />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Satuan">
            <CreatableSelect
              value={unit}
              options={[...new Set([...UNITS, ...(unit ? [unit] : [])])].map((u) => ({ id: u, name: u }))}
              onChange={setUnit}
              onCreate={(n) => n}
            />
          </Field>
          <Field label="Harga Jual">
            <NumberInput value={sellPrice} onChange={setSellPrice} />
          </Field>
          <Field label="Stok minimum" hint="Batas status menipis">
            <NumberInput value={minStock} onChange={setMinStock} />
          </Field>
        </div>
        {costRef > 0 && sellPrice <= costRef && (
          <WarnBox>
            Harga Jual ({rupiah(sellPrice)}) tidak lebih tinggi dari Harga Beli Terakhir ({rupiah(costRef)}).
          </WarnBox>
        )}
        {!isNew && (
          <p className="text-xs text-slate-500">
            Harga Beli Terakhir {rupiah(existing.last_cost)}, HPP {rupiah(existing.hpp)}. Berubah lewat Penerimaan Barang.
            Stok tidak bisa diubah di sini.
          </p>
        )}
      </Card>

      {isNew && (
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold tracking-tight">Stok Awal</h2>
          <p className="text-sm text-slate-500">
            Jumlah yang sudah ada di bengkel saat ini. Hanya diisi sekali; setelahnya Stok berubah lewat Penerimaan Barang
            dan Penjualan.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stok Awal">
              <NumberInput value={initialStock} onChange={setInitialStock} />
            </Field>
            <Field label="Harga beli per unit" hint="Jadi Harga Beli Terakhir & HPP awal">
              <NumberInput value={initialCost} onChange={setInitialCost} />
            </Field>
          </div>
        </Card>
      )}

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold tracking-tight">Barcode</h2>
        {barcodes.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {barcodes.map((b) => (
              <li key={b} className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-1 pr-1 pl-2.5 font-mono text-sm text-slate-800 ring-1 ring-inset ring-slate-200">
                {b}
                <button
                  type="button"
                  aria-label={`Hapus Barcode ${b}`}
                  className="rounded px-1 py-0.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                  onClick={() => setBarcodes((x) => x.filter((y) => y !== b))}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <ScanSearchInput
          value={barcodeText}
          onChange={setBarcodeText}
          onSubmit={addBarcode}
          placeholder="Scan atau ketik Barcode lalu Enter"
        />
        {barcodeError && (
          <ErrorBox>
            {barcodeError.text}{' '}
            {barcodeError.productId && (
              <Link className="underline" to={`/stok/${barcodeError.productId}`}>
                Buka Sparepart itu
              </Link>
            )}
          </ErrorBox>
        )}
        <p className="text-xs text-slate-500">Opsional. Satu Sparepart boleh punya beberapa Barcode.</p>
      </Card>

      {!isNew && (
        <Card className="p-5">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="size-5 accent-teal-700" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>
              <span className="font-medium">Aktif</span>
              <span className="block text-sm text-slate-500">
                Sparepart nonaktif hilang dari kasir dan pencarian, tetapi tetap ada di riwayat.
              </span>
            </span>
          </label>
        </Card>
      )}

      <ErrorBox>{error}</ErrorBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || !online} className="flex-1">
          <Save size={18} />
          {busy ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Batal
        </Button>
        {!isNew && (
          <Button variant="ghost" className="text-red-600" disabled={busy || !online} onClick={remove}>
            <Trash2 size={18} />
            Hapus permanen
          </Button>
        )}
      </div>
    </form>
  )
}

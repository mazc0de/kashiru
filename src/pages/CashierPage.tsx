import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Minus, Plus, Printer, Save, Trash2, Wrench, X } from 'lucide-react'
import { PrintReceipt } from '../components/Receipt'
import { ScanSearchInput } from '../components/ScanSearchInput'
import { Select } from '../components/Select'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  Modal,
  NumberInput,
  SegmentedToggle,
  Spinner,
  StockBadge,
  Switch,
  WarnBox,
} from '../components/ui'
import { useMyProfile } from '../lib/auth'
import { computeTotals, emptyCart, usePersistentCart, type Cart, type CartLine } from '../lib/cart'
import { errorText, isNetworkError } from '../lib/errors'
import { normalizePlate, num, paymentLabel, rupiah, stockStatus, type DiscountMode } from '../lib/format'
import { useOnline } from '../lib/online'
import {
  looksLikeBarcode,
  searchCatalog,
  useCatalog,
  useCategories,
  useMechanics,
  useStore,
  type CatalogEntry,
} from '../lib/queries'
import { fetchSale } from '../lib/sales'
import { supabase } from '../lib/supabase'
import type { PaymentMethod, SaleWithDetails } from '../lib/types'

const PAGE = 120

const discModes: { value: DiscountMode; label: string }[] = [
  { value: 'amount', label: 'Rp' },
  { value: 'percent', label: '%' },
]

export function CashierPage() {
  const profile = useMyProfile()
  const storeId = profile.data!.store_id
  return <Cashier key={storeId} storeId={storeId} />
}

function Cashier({ storeId }: { storeId: string }) {
  const catalog = useCatalog()
  const store = useStore()
  const categories = useCategories()
  const mechanics = useMechanics()
  const online = useOnline()
  const qc = useQueryClient()
  const [cart, setCart] = usePersistentCart(storeId)
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [saleDiscOn, setSaleDiscOn] = useState(() => cart.discValue > 0)
  const [saved, setSaved] = useState<SaleWithDetails | null>(null)
  const [printKey, setPrintKey] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const products = useMemo(() => {
    const active = catalog.entries.filter((e) => e.is_active && (!categoryId || e.category_id === categoryId))
    return query.trim() ? searchCatalog(active, query, active.length) : active
  }, [catalog.entries, categoryId, query])
  const priceOf = (id: string) => catalog.byId.get(id)?.sell_price ?? 0
  const totals = computeTotals(cart, priceOf)
  const qtyInCart = (productId: string) =>
    cart.lines.reduce((s, l) => s + (l.kind === 'part' && l.productId === productId ? l.qty : 0), 0)

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 3500)
    return () => window.clearTimeout(t)
  }, [flash])

  const update = (fn: (c: Cart) => Cart) => setCart((c) => fn(c))
  const updateLine = (key: string, patch: Partial<CartLine>) =>
    update((c) => ({ ...c, lines: c.lines.map((l) => (l.key === key ? ({ ...l, ...patch } as CartLine) : l)) }))

  function addProduct(p: CatalogEntry) {
    if (!p.is_active) {
      setFlash({ kind: 'error', text: `${p.name} sudah nonaktif dan tidak bisa dijual.` })
      return
    }
    update((c) => {
      const existing = c.lines.find((l) => l.kind === 'part' && l.productId === p.id)
      if (existing) {
        return { ...c, lines: c.lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l)) }
      }
      const line: CartLine = {
        key: crypto.randomUUID(),
        kind: 'part',
        productId: p.id,
        qty: 1,
        discMode: 'amount',
        discValue: 0,
      }
      return { ...c, lines: [...c.lines, line] }
    })
    setFlash({ kind: 'ok', text: `+1 ${p.name}` })
  }

  function onSubmitSearch(value: string, source: 'keyboard' | 'camera') {
    const byBarcode = catalog.findByCode(value)
    if (byBarcode) {
      addProduct(byBarcode)
      setQuery('')
      return
    }
    if (source === 'camera' || (looksLikeBarcode(value) && products.length === 0)) {
      setFlash({ kind: 'error', text: `Barcode ${value} tidak dikenal. Tidak ada yang ditambahkan.` })
      setQuery('')
      return
    }
    // Enter pada teks biasa hanya menambah jika hasilnya tepat satu; selebihnya pilih dari daftar.
    if (products.length === 1) {
      addProduct(products[0])
      setQuery('')
    } else if (products.length === 0) setFlash({ kind: 'error', text: `“${value}” tidak ditemukan.` })
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: cart.clientId,
        payment_method: cart.method,
        paid: cart.method === 'cash' ? cart.paid : totals.total,
        discount: totals.saleDiscount,
        vehicle_plate: normalizePlate(cart.plate),
        customer_name: cart.customer.trim(),
        mechanic_id: cart.mechanicId || null,
        items: cart.lines.map((l) =>
          l.kind === 'part'
            ? { kind: 'part', product_id: l.productId, qty: l.qty, discount: totals.lineAmounts.get(l.key)!.discount }
            : {
                kind: 'service',
                name: l.name,
                price: l.price,
                qty: l.qty,
                discount: totals.lineAmounts.get(l.key)!.discount,
              },
        ),
      }
      const { data, error } = await supabase.rpc('create_sale', { p: payload })
      if (error) throw error
      return fetchSale(data as string)
    },
    onSuccess: (sale) => {
      setCart(emptyCart())
      setSaleDiscOn(false)
      setSaved(sale)
      setPrintKey((k) => k + 1)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  const cashShort = cart.method === 'cash' && cart.paid < totals.total
  const canSave = online && cart.lines.length > 0 && !cashShort && !save.isPending
  const quickCash = useMemo(() => {
    const t = totals.total
    const opts = new Set<number>([t])
    for (const step of [10000, 20000, 50000, 100000]) opts.add(Math.ceil(t / step) * step)
    return [...opts].filter((n) => n >= t && n > 0).sort((a, b) => a - b).slice(0, 4)
  }, [totals.total])

  if (catalog.isLoading) return <Spinner label="Memuat data Sparepart…" />

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      {/* Kiri: daftar Sparepart, sentuh untuk menambah */}
      <div className="min-w-0 space-y-3">
        <ScanSearchInput
          ref={searchRef}
          autoFocus
          continuousCamera
          placeholder="Saring nama, Nomor Part, Tipe Kendaraan, atau scan Barcode"
          value={query}
          onChange={(v) => {
            setQuery(v)
            setLimit(PAGE)
          }}
          onSubmit={onSubmitSearch}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
        />
        {(categories.data ?? []).length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(categories.data ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId((id) => (id === c.id ? null : c.id))
                  setLimit(PAGE)
                }}
                className={`min-h-10 shrink-0 rounded-full border px-3 text-sm ${categoryId === c.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {flash && (
          <div
            className={`rounded-lg px-3 py-2 text-sm font-medium ${flash.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
          >
            {flash.text}
          </div>
        )}

        <div className="max-h-[55vh] overflow-y-auto lg:max-h-[calc(100dvh-13rem)]">
          {products.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              {catalog.entries.length === 0 ? 'Belum ada Sparepart.' : 'Tidak ada Sparepart yang cocok.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {products.slice(0, limit).map((p) => {
                const inCart = qtyInCart(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className={`relative flex min-h-28 flex-col justify-between gap-1 rounded-xl border bg-white p-3 text-left transition-colors active:bg-teal-50 ${inCart ? 'border-teal-600 ring-1 ring-teal-600' : 'border-slate-200 hover:border-teal-600'}`}
                  >
                    {inCart > 0 && (
                      <span className="absolute -top-2 -right-2 flex min-w-6 items-center justify-center rounded-full bg-teal-700 px-1.5 text-xs font-semibold text-white">
                        {num(inCart)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-slate-500">
                        {[p.part_number, p.brandName].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-teal-800">{rupiah(p.sell_price)}</div>
                      <div className="flex items-center justify-between gap-1 text-xs text-slate-500">
                        <span className="truncate">
                          Stok {num(p.stock)} {p.unit}
                        </span>
                        <StockBadge status={stockStatus(p)} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {products.length > limit && (
            <div className="p-3 text-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                Tampilkan lebih banyak ({products.length - limit} lagi)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Kanan: keranjang, ringkasan & bayar */}
      <Card className="h-fit space-y-3 p-3 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Keranjang</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setServiceOpen(true)}>
              <Wrench size={18} />
              Jasa
            </Button>
            {cart.lines.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (!confirm('Kosongkan keranjang?')) return
                  setCart(emptyCart())
                  setSaleDiscOn(false)
                }}
              >
                <X size={18} />
                Kosongkan
              </Button>
            )}
          </div>
        </div>
        {cart.lines.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
            Sentuh Sparepart di daftar atau scan Barcode untuk memulai.
          </p>
        ) : (
          <ul className="-mx-3 border-y border-slate-100">
            {cart.lines.map((l) => (
              <CartRow
                key={l.key}
                line={l}
                product={l.kind === 'part' ? catalog.byId.get(l.productId) : undefined}
                amounts={totals.lineAmounts.get(l.key)!}
                totalQtyOfProduct={l.kind === 'part' ? qtyInCart(l.productId) : 0}
                onChange={(patch) => updateLine(l.key, patch)}
                onRemove={() => update((c) => ({ ...c, lines: c.lines.filter((x) => x.key !== l.key) }))}
              />
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Field label="Nopol">
            <Input
              value={cart.plate}
              placeholder="H 1234 AB"
              onChange={(e) => update((c) => ({ ...c, plate: e.target.value.toUpperCase() }))}
              onBlur={() => update((c) => ({ ...c, plate: normalizePlate(c.plate) }))}
            />
          </Field>
          <Field label="Nama Pelanggan">
            <Input value={cart.customer} onChange={(e) => update((c) => ({ ...c, customer: e.target.value }))} />
          </Field>
        </div>
        <Field label="Mekanik">
          <Select
            value={cart.mechanicId || null}
            onChange={(id) => update((c) => ({ ...c, mechanicId: id ?? '' }))}
            placeholder="Pilih Mekanik (opsional)"
            options={(mechanics.data ?? [])
              .filter((m) => m.is_active || m.id === cart.mechanicId)
              .map((m) => ({ value: m.id, label: m.name }))}
          />
        </Field>

        <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <Row label="Subtotal" value={rupiah(totals.subtotal)} />
          {totals.lineDiscount > 0 && <Row label="Diskon baris" value={`−${rupiah(totals.lineDiscount)}`} />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Switch
              label="Diskon Penjualan"
              checked={saleDiscOn}
              onChange={(on) => {
                setSaleDiscOn(on)
                if (!on) update((c) => ({ ...c, discMode: 'amount', discValue: 0 }))
              }}
            />
            {saleDiscOn && (
              <div className="flex items-center gap-1">
                <SegmentedToggle
                  value={cart.discMode}
                  options={discModes}
                  onChange={(m) => update((c) => ({ ...c, discMode: m, discValue: 0 }))}
                />
                <NumberInput
                  className="w-28 text-right"
                  value={cart.discValue}
                  onChange={(n) => update((c) => ({ ...c, discValue: n }))}
                />
              </div>
            )}
          </div>
          {totals.saleDiscount > 0 && <Row label="" value={`−${rupiah(totals.saleDiscount)}`} />}
          <div className="flex items-center justify-between pt-2 text-2xl font-bold">
            <span>Total</span>
            <span>{rupiah(totals.total)}</span>
          </div>
        </div>

        <SegmentedToggle<PaymentMethod>
          value={cart.method}
          options={(['cash', 'qris', 'transfer'] as const).map((m) => ({ value: m, label: paymentLabel[m] }))}
          onChange={(m) => update((c) => ({ ...c, method: m }))}
        />

        {cart.method === 'cash' ? (
          <div className="space-y-2">
            <Field label="Uang diterima">
              <NumberInput
                className="text-right text-lg"
                value={cart.paid}
                onChange={(n) => update((c) => ({ ...c, paid: n }))}
              />
            </Field>
            <div className="flex flex-wrap gap-1">
              {quickCash.map((n, i) => (
                <Button key={n} variant="secondary" className="px-2 text-sm" onClick={() => update((c) => ({ ...c, paid: n }))}>
                  {i === 0 ? 'Uang pas' : num(n)}
                </Button>
              ))}
            </div>
            <Row
              label="Kembalian"
              value={cashShort ? `Kurang ${rupiah(totals.total - cart.paid)}` : rupiah(cart.paid - totals.total)}
              strong
            />
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-600">
            {cart.method === 'qris'
              ? 'Pastikan pembayaran QRIS sudah masuk sebelum menyimpan.'
              : 'Pastikan transfer sudah diterima sebelum menyimpan.'}
          </p>
        )}

        {save.error && (
          <ErrorBox>
            {isNetworkError(save.error)
              ? 'Koneksi terputus saat menyimpan. Keranjang tetap aman — tekan Simpan lagi setelah koneksi pulih (tidak akan tercatat dua kali).'
              : errorText(save.error)}
          </ErrorBox>
        )}
        <Button className="w-full text-lg" disabled={!canSave} onClick={() => save.mutate()}>
          <Save size={20} />
          {save.isPending ? 'Menyimpan…' : !online ? 'Offline — tidak bisa simpan' : 'Simpan & Cetak'}
        </Button>
      </Card>

      <ServiceModal
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        onAdd={(name, price) =>
          update((c) => ({
            ...c,
            lines: [
              ...c.lines,
              { key: crypto.randomUUID(), kind: 'service', name, price, qty: 1, discMode: 'amount', discValue: 0 },
            ],
          }))
        }
      />

      <Modal open={!!saved} onClose={() => setSaved(null)} title="Penjualan tersimpan">
        {saved && (
          <div className="space-y-3">
            <p>
              Nomor Nota <b>{saved.receipt_no}</b> — total <b>{rupiah(saved.total)}</b>
              {saved.payment_method === 'cash' && (
                <>
                  , kembalian <b>{rupiah(saved.change)}</b>
                </>
              )}
              .
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPrintKey((k) => k + 1)}>
                <Printer size={18} />
                Cetak
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setSaved(null)
                  searchRef.current?.focus()
                }}
              >
                <Plus size={18} />
                Penjualan baru
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {saved && store.data && <PrintReceipt sale={saved} store={store.data} printKey={printKey} />}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-base font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function CartRow({
  line,
  product,
  amounts,
  totalQtyOfProduct,
  onChange,
  onRemove,
}: {
  line: CartLine
  product?: CatalogEntry
  amounts: { gross: number; discount: number; net: number }
  totalQtyOfProduct: number
  onChange: (patch: Partial<CartLine>) => void
  onRemove: () => void
}) {
  const name = line.kind === 'part' ? (product?.name ?? 'Sparepart tidak ditemukan') : line.name
  const price = line.kind === 'part' ? (product?.sell_price ?? 0) : line.price
  const afterSale = product ? product.stock - totalQtyOfProduct : 0
  const [discOn, setDiscOn] = useState(line.discValue > 0)
  return (
    <li className="space-y-2 border-b border-slate-100 p-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">
            {line.kind === 'service' && (
              <span className="mr-1 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Jasa</span>
            )}
            {name}
          </div>
          <div className="text-xs text-slate-500">
            {line.kind === 'part' && product?.part_number && `${product.part_number} · `}
            {rupiah(price)}
            {line.kind === 'part' && product && ` / ${product.unit}`}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-semibold">{rupiah(amounts.net)}</div>
          {amounts.discount > 0 && <div className="text-xs text-slate-500 line-through">{rupiah(amounts.gross)}</div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <Button variant="secondary" className="rounded-r-none px-3" onClick={() => line.qty > 1 && onChange({ qty: line.qty - 1 })}>
            <Minus size={16} />
          </Button>
          <NumberInput
            className="w-16 rounded-none text-center"
            value={line.qty}
            onChange={(n) => onChange({ qty: Math.max(1, n) })}
          />
          <Button variant="secondary" className="rounded-l-none px-3" onClick={() => onChange({ qty: line.qty + 1 })}>
            <Plus size={16} />
          </Button>
        </div>
        <Switch
          label="Diskon"
          checked={discOn}
          onChange={(on) => {
            setDiscOn(on)
            if (!on) onChange({ discMode: 'amount', discValue: 0 })
          }}
        />
        <Button variant="ghost" className="ml-auto text-red-600" onClick={onRemove} title="Hapus">
          <Trash2 size={18} />
        </Button>
      </div>
      {discOn && (
        <div className="flex items-center justify-end gap-1">
          <SegmentedToggle value={line.discMode} options={discModes} onChange={(m) => onChange({ discMode: m, discValue: 0 })} />
          <NumberInput
            autoFocus
            className="w-28 text-right"
            value={line.discValue}
            onChange={(n) => onChange({ discValue: n })}
          />
        </div>
      )}
      {line.kind === 'part' && product && afterSale < 0 && (
        <WarnBox>
          Stok sistem {num(product.stock)} {product.unit} — setelah Penjualan ini Stok jadi {num(afterSale)}. Tetap bisa
          disimpan; cek Penerimaan Barang yang belum diinput.
        </WarnBox>
      )}
    </li>
  )
}

function ServiceModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (name: string, price: number) => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  return (
    <Modal open={open} onClose={onClose} title="Tambah Jasa">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onAdd(name.trim(), price)
          setName('')
          setPrice(0)
          onClose()
        }}
      >
        <Field label="Nama Jasa">
          <Input autoFocus value={name} placeholder="Ongkos pasang kampas rem" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Harga">
          <NumberInput value={price} onChange={setPrice} />
        </Field>
        <Button type="submit" className="w-full" disabled={!name.trim()}>
          <Check size={18} />
          Tambahkan
        </Button>
      </form>
    </Modal>
  )
}

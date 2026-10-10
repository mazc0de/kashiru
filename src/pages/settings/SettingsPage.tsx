import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ChevronRight, LogOut, Tags, Users, Wrench, type LucideIcon } from 'lucide-react'
import { Button, Card, ErrorBox, Field, Input, PageHeader, SegmentedToggle, Spinner, Textarea, focusRing } from '../../components/ui'
import { useMyProfile, useSignOut } from '../../lib/auth'
import { errorText } from '../../lib/errors'
import { useOnline } from '../../lib/online'
import { useStore } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import type { PaperWidth, Store } from '../../lib/types'

export function SettingsPage() {
  const store = useStore()
  const signOut = useSignOut()
  if (!store.data) return <Spinner />
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Pengaturan" />
      <div className="grid gap-2 sm:grid-cols-3">
        <NavCard to="/pengaturan/pengguna" icon={Users} title="Pengguna" desc="Tambah & nonaktifkan akun" />
        <NavCard to="/pengaturan/kategori-merek" icon={Tags} title="Kategori & Merek" desc="Daftar pengelompokan Sparepart" />
        <NavCard to="/pengaturan/mekanik" icon={Wrench} title="Mekanik" desc="Daftar Mekanik untuk Penjualan" />
      </div>
      <StoreForm key={store.data.id} store={store.data} />
      <MyNameForm />
      <Button variant="secondary" className="w-full" onClick={signOut}>
        <LogOut size={18} />
        Keluar
      </Button>
    </div>
  )
}

function NavCard({ to, icon: Icon, title, desc }: { to: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className={`group flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-panel transition-[border-color,box-shadow,transform] duration-150 hover:border-slate-300 hover:shadow-raised active:scale-[0.99] ${focusRing}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-700/10 text-teal-800">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-900">{title}</span>
        <span className="block text-xs leading-relaxed text-slate-500">{desc}</span>
      </span>
      <ChevronRight size={16} className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}

function StoreForm({ store }: { store: Store }) {
  const qc = useQueryClient()
  const online = useOnline()
  const [name, setName] = useState(store.name)
  const [address, setAddress] = useState(store.address)
  const [phone, setPhone] = useState(store.phone)
  const [code, setCode] = useState(store.code)
  const [paper, setPaper] = useState<PaperWidth>(store.paper_width)
  const [footer, setFooter] = useState(store.receipt_footer)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (code.length < 2) return setError('Kode Toko harus 2-4 huruf.')
    setBusy(true)
    setError('')
    setMsg('')
    const { error } = await supabase
      .from('stores')
      .update({
        name: name.trim(),
        code,
        address: address.trim(),
        phone: phone.trim(),
        paper_width: paper,
        receipt_footer: footer.trim(),
      })
      .eq('id', store.id)
    setBusy(false)
    if (error) return setError(errorText(error))
    setMsg('Tersimpan.')
    qc.invalidateQueries({ queryKey: ['store'] })
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Toko & Nota</h2>
        <Field label="Nama Toko">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Alamat">
          <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Telepon / WA">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field
          label="Kode Toko"
          hint="2-4 huruf, awalan Nomor Nota. Perubahan hanya berlaku untuk Nota baru; Nota lama tetap memakai kode lama."
        >
          <Input
            required
            value={code}
            maxLength={4}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Ukuran kertas Nota</span>
          <SegmentedToggle<string>
            value={String(paper)}
            options={[
              { value: '58', label: '58 mm' },
              { value: '80', label: '80 mm' },
            ]}
            onChange={(v) => setPaper(Number(v) as PaperWidth)}
          />
        </div>
        <Field label="Catatan kaki Nota" hint="Mis. ketentuan garansi">
          <Textarea rows={3} value={footer} onChange={(e) => setFooter(e.target.value)} />
        </Field>
        <ErrorBox>{error}</ErrorBox>
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <Button type="submit" disabled={busy || !online}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </form>
    </Card>
  )
}

function MyNameForm() {
  const profile = useMyProfile()
  const qc = useQueryClient()
  const [name, setName] = useState(profile.data?.display_name ?? '')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    setError('')
    const { error } = await supabase.rpc('update_my_display_name', { p_display_name: name })
    if (error) return setError(errorText(error))
    setMsg('Tersimpan.')
    qc.invalidateQueries({ queryKey: ['me'] })
    qc.invalidateQueries({ queryKey: ['profiles'] })
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Akun saya</h2>
        <p className="text-sm text-slate-500">{profile.data?.email}</p>
        <Field label="Nama (tampil sebagai kasir di Nota)">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <ErrorBox>{error}</ErrorBox>
        {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        <Button type="submit" variant="secondary">
          Simpan nama
        </Button>
      </form>
    </Card>
  )
}

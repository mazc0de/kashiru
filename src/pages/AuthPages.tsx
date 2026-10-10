import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { OfflineBanner } from '../components/Layout'
import { Button, ErrorBox, Field, Input, Spinner } from '../components/ui'
import { useAuth, useMyProfile, useSignOut } from '../lib/auth'
import { errorText } from '../lib/errors'
import { supabase } from '../lib/supabase'

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,rgb(15_118_110/0.08),transparent_60%)]">
      <OfflineBanner />
      <div className="mx-auto max-w-sm px-4 pt-14 pb-12 sm:pt-20">
        <div className="mb-8 flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-xl bg-teal-700 text-xl font-bold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]"
          >
            K
          </span>
          <div>
            <div className="text-xl leading-tight font-semibold tracking-tight text-slate-900">Kashiru</div>
            <p className="text-sm leading-tight text-slate-500">POS bengkel</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-raised">
          <h1 className="mb-5 text-xl font-semibold tracking-tight">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (session) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(errorText(error))
  }

  return (
    <AuthCard title="Masuk">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Masuk…' : 'Masuk'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Belum punya Toko?{' '}
        <Link to="/daftar" className="font-medium text-teal-700 underline-offset-2 hover:underline">
          Daftar Toko baru
        </Link>
      </p>
    </AuthCard>
  )
}

/** Pendaftaran publik: hanya untuk membuat Toko baru. */
export function SignupPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (session) return <Navigate to="/buat-toko" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Password minimal 8 karakter.')
    setBusy(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/buat-toko` },
    })
    setBusy(false)
    if (error) return setError(errorText(error))
    if (!data.session) setSent(true)
  }

  if (sent) {
    return (
      <AuthCard title="Cek email Anda">
        <p className="leading-relaxed text-slate-600">
          Kami mengirim tautan konfirmasi ke <b>{email}</b>. Buka tautan itu, lalu masuk untuk melanjutkan membuat Toko.
        </p>
        <Link to="/login" className="mt-5 block text-center font-medium text-teal-700 underline-offset-2 hover:underline">
          Ke halaman masuk
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Daftar Toko baru">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint="Minimal 8 karakter">
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Mendaftar…' : 'Lanjut'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Sudah punya akun?{' '}
        <Link to="/login" className="font-medium text-teal-700 underline-offset-2 hover:underline">
          Masuk
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">
        Karyawan bengkel tidak mendaftar di sini. Akunnya dibuat dari menu Pengaturan → Pengguna.
      </p>
    </AuthCard>
  )
}

export function CreateStorePage() {
  const { session, loading } = useAuth()
  const profile = useMyProfile()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const signOut = useSignOut()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading || profile.isLoading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (profile.data) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('create_store', {
      p_name: name,
      p_code: code,
      p_display_name: displayName,
    })
    if (error) {
      setBusy(false)
      return setError(errorText(error))
    }
    await qc.invalidateQueries({ queryKey: ['me'] })
    navigate('/', { replace: true })
  }

  return (
    <AuthCard title="Buat Toko">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nama Toko">
          <Input required value={name} placeholder="Bengkel Maju Jaya" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Kode Toko" hint="2-4 huruf, dipakai di awal Nomor Nota (mis. BMJ-261009-0001). Bisa diubah nanti di Pengaturan.">
          <Input
            required
            value={code}
            maxLength={4}
            placeholder="BMJ"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
        </Field>
        <Field label="Nama Anda" hint="Tampil sebagai kasir di Nota">
          <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" disabled={busy || code.length < 2}>
          {busy ? 'Membuat…' : 'Buat Toko'}
        </Button>
      </form>
      <button type="button" className="mt-4 w-full text-center text-sm text-slate-500 hover:underline" onClick={signOut}>
        Keluar ({session.user.email})
      </button>
    </AuthCard>
  )
}

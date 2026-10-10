import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import { Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { errorMessage, errorText } from '../../lib/errors'
import { useOnline } from '../../lib/online'
import { useProfiles } from '../../lib/queries'
import { supabase } from '../../lib/supabase'

export function UsersPage() {
  const { session } = useAuth()
  const profiles = useProfiles()
  const qc = useQueryClient()
  const online = useOnline()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function toggle(userId: string, active: boolean) {
    setError('')
    const { error } = await supabase.rpc('set_user_active', { p_user_id: userId, p_active: active })
    if (error) return setError(errorText(error))
    qc.invalidateQueries({ queryKey: ['profiles'] })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader title="Pengguna" actions={<Button onClick={() => setOpen(true)} disabled={!online}>
            <UserPlus size={18} />
            Pengguna
          </Button>} />
      <p className="max-w-[65ch] text-sm leading-relaxed text-slate-500">
        Semua Pengguna punya akses penuh yang sama. Pengguna yang keluar dinonaktifkan: tidak bisa login, tetapi tetap
        tercatat di riwayat.
      </p>
      <ErrorBox>{error}</ErrorBox>
      <Card>
        {profiles.isLoading ? (
          <Spinner />
        ) : (
          <ul>
            {(profiles.data ?? []).map((p) => {
              const me = p.user_id === session?.user.id
              return (
                <li key={p.user_id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {p.display_name} {me && <span className="text-xs text-slate-500">(Anda)</span>}
                      {!p.is_active && (
                        <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500">{p.email}</div>
                  </div>
                  {!me && (
                    <Button variant="secondary" disabled={!online} onClick={() => toggle(p.user_id, !p.is_active)}>
                      {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <NewUserModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function NewUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.functions.invoke('create-user', {
      body: { email, password, display_name: name },
    })
    setBusy(false)
    if (error) return setError(await errorMessage(error))
    setName('')
    setEmail('')
    setPassword('')
    qc.invalidateQueries({ queryKey: ['profiles'] })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Pengguna baru">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nama">
          <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email (untuk login)">
          <Input type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password awal" hint="Minimal 8 karakter. Berikan ke Pengguna tersebut.">
          <Input required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Membuat…' : 'Buat Pengguna'}
        </Button>
      </form>
    </Modal>
  )
}

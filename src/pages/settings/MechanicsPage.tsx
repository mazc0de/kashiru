import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button, Card, ErrorBox, Input, PageHeader, Spinner } from '../../components/ui'
import { errorText } from '../../lib/errors'
import { useMechanics } from '../../lib/queries'
import { supabase } from '../../lib/supabase'

export function MechanicsPage() {
  const mechanics = useMechanics()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['mechanics'] })

  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('mechanics').insert({ name: name.trim() })
    if (error) return setError(errorText(error))
    setName('')
    refresh()
  }

  async function toggle(id: string, active: boolean) {
    setError('')
    const { error } = await supabase.from('mechanics').update({ is_active: active }).eq('id', id)
    if (error) return setError(errorText(error))
    refresh()
  }

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <PageHeader title="Mekanik" />
      <p className="max-w-[65ch] text-sm leading-relaxed text-slate-500">
        Mekanik tidak login; namanya dipilih di kasir dan tercetak di Nota. Mekanik yang keluar dinonaktifkan.
      </p>
      <Card className="p-4">
        <form onSubmit={add} className="mb-2 flex gap-2">
          <Input value={name} placeholder="Nama Mekanik" onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!name.trim()}>
            <Plus size={18} />
            Tambah
          </Button>
        </form>
        <ErrorBox>{error}</ErrorBox>
        {mechanics.isLoading ? (
          <Spinner />
        ) : (
          <ul>
            {(mechanics.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <span className={m.is_active ? 'font-medium text-slate-900' : 'text-slate-500'}>
                  {m.name} {!m.is_active && '(nonaktif)'}
                </span>
                <Button variant="secondary" onClick={() => toggle(m.id, !m.is_active)}>
                  {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

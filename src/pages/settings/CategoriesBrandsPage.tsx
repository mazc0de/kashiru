import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card, ErrorBox, Input, PageHeader, Spinner } from '../../components/ui'
import { errorText } from '../../lib/errors'
import { useBrands, useCategories, useProducts } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import type { NamedItem } from '../../lib/types'

export function CategoriesBrandsPage() {
  const categories = useCategories()
  const brands = useBrands()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Kategori & Merek" />
      <div className="grid gap-4 md:grid-cols-2">
        <NamedList title="Kategori" table="categories" items={categories.data} loading={categories.isLoading} field="category_id" />
        <NamedList title="Merek" table="brands" items={brands.data} loading={brands.isLoading} field="brand_id" />
      </div>
    </div>
  )
}

function NamedList({
  title,
  table,
  items,
  loading,
  field,
}: {
  title: string
  table: 'categories' | 'brands'
  items?: NamedItem[]
  loading: boolean
  field: 'category_id' | 'brand_id'
}) {
  const qc = useQueryClient()
  const products = useProducts()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')

  const usage = (id: string) => (products.data ?? []).filter((p) => p[field] === id).length
  const refresh = () => qc.invalidateQueries({ queryKey: [table] })

  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from(table).insert({ name: name.trim() })
    if (error) return setError(errorText(error))
    setName('')
    refresh()
  }

  async function rename() {
    if (!editing) return
    setError('')
    const { error } = await supabase.from(table).update({ name: editing.name.trim() }).eq('id', editing.id)
    if (error) return setError(errorText(error))
    setEditing(null)
    refresh()
  }

  async function remove(item: NamedItem) {
    const n = usage(item.id)
    if (!confirm(n ? `${item.name} dipakai ${n} Sparepart; kolomnya akan dikosongkan. Hapus?` : `Hapus ${item.name}?`)) return
    setError('')
    const { error } = await supabase.from(table).delete().eq('id', item.id)
    if (error) return setError(errorText(error))
    refresh()
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      <form onSubmit={add} className="mb-3 flex gap-2">
        <Input value={name} placeholder={`${title} baru`} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={!name.trim()}>
          <Plus size={18} />
          Tambah
        </Button>
      </form>
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <Spinner />
      ) : (
        <ul>
          {(items ?? []).map((it) => (
            <li key={it.id} className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
              {editing?.id === it.id ? (
                <>
                  <Input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && rename()}
                  />
                  <Button onClick={rename} title="Simpan">
                    <Check size={18} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1">
                    {it.name} <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{usage(it.id)}</span>
                  </span>
                  <Button variant="ghost" onClick={() => setEditing({ id: it.id, name: it.name })} title="Ubah">
                    <Pencil size={18} />
                  </Button>
                  <Button variant="ghost" className="text-red-600" onClick={() => remove(it)} title="Hapus">
                    <Trash2 size={18} />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

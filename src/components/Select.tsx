import { useState } from 'react'
import ReactSelect, { type ClassNamesConfig, type GroupBase } from 'react-select'
import Creatable from 'react-select/creatable'

type Option = { value: string; label: string }

/** Gaya Tailwind bersama untuk semua dropdown (react-select, mode unstyled). */
const selectClassNames: ClassNamesConfig<Option, false, GroupBase<Option>> = {
  control: ({ isFocused, isDisabled }) =>
    `min-h-11 rounded-lg border bg-white px-3 shadow-panel transition-[border-color,box-shadow] duration-150 ${isDisabled ? 'bg-slate-100' : ''} ${isFocused ? 'border-teal-600 ring-4 ring-teal-600/15' : 'border-slate-300 hover:border-slate-400'}`,
  placeholder: () => 'text-slate-500',
  valueContainer: () => 'gap-1',
  indicatorsContainer: () => 'gap-1 text-slate-400',
  clearIndicator: () => 'p-1 hover:text-slate-600',
  dropdownIndicator: () => 'p-1 hover:text-slate-600',
  menu: () => 'animate-flash mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-raised',
  menuList: () => 'max-h-64',
  option: ({ isFocused, isSelected }) =>
    `rounded-lg px-3 py-2 ${isSelected ? 'font-semibold text-teal-800' : ''} ${isFocused ? 'bg-slate-100' : ''}`,
  noOptionsMessage: () => 'px-3 py-2 text-sm text-slate-500',
}

/** Props bersama untuk Select & CreatableSelect. */
const baseSelectProps = {
  unstyled: true,
  classNames: selectClassNames,
  menuPortalTarget: typeof document === 'undefined' ? undefined : document.body,
  styles: { menuPortal: (base: object) => ({ ...base, zIndex: 50 }) },
  noOptionsMessage: () => 'Tidak ada pilihan',
} as const

/** Dropdown berbasis react-select. Tanpa nilai default: kosong ⇒ tampil placeholder. */
export function Select({
  value,
  options,
  onChange,
  placeholder = 'Pilih…',
  isClearable = true,
  className = '',
}: {
  value: string | null
  options: Option[]
  onChange: (value: string | null) => void
  placeholder?: string
  isClearable?: boolean
  className?: string
}) {
  return (
    <ReactSelect<Option, false>
      {...baseSelectProps}
      className={className}
      value={options.find((o) => o.value === value) ?? null}
      options={options}
      onChange={(o) => onChange(o?.value ?? null)}
      placeholder={placeholder}
      isClearable={isClearable}
    />
  )
}

/** Dropdown dengan pencarian dan opsi "+ Tambah '…'" untuk daftar ringan (Kategori, Merek, Satuan). */
export function CreatableSelect({
  value,
  options,
  onChange,
  onCreate,
  placeholder = 'Pilih…',
}: {
  value: string | null
  options: { id: string; name: string }[]
  onChange: (id: string | null) => void
  onCreate: (name: string) => Promise<string> | string
  placeholder?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const opts: Option[] = options.map((o) => ({ value: o.id, label: o.name }))

  async function create(name: string) {
    setBusy(true)
    setError('')
    try {
      onChange(await onCreate(name.trim()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menambah.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Creatable<Option, false>
        {...baseSelectProps}
        isClearable
        isDisabled={busy}
        isLoading={busy}
        value={opts.find((o) => o.value === value) ?? null}
        options={opts}
        onChange={(o) => onChange(o?.value ?? null)}
        onCreateOption={create}
        formatCreateLabel={(q) => `+ Tambah “${q.trim()}”`}
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}

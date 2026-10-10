import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from './ui'

/** Multi-label teks bebas dengan autocomplete (Tipe Kendaraan). */
export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  suggestions: string[]
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const q = text.trim().toLowerCase()
  const hits = q
    ? suggestions.filter((s) => s.toLowerCase().includes(q) && !value.includes(s)).slice(0, 8)
    : []

  function add(tag: string) {
    const t = tag.trim()
    if (!t) return
    const existing = value.find((v) => v.toLowerCase() === t.toLowerCase())
    if (!existing) onChange([...value, t])
    setText('')
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-1 pr-1 pl-2.5 text-sm text-slate-800 ring-1 ring-inset ring-slate-200">
              {v}
              <button
                type="button"
                aria-label={`Hapus ${v}`}
                className="rounded px-1 py-0.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(text)}
        />
        {hits.length > 0 && (
          <div
            className="animate-flash absolute z-30 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-raised"
            onMouseDown={(e) => e.preventDefault()}
          >
            {hits.map((h) => (
              <button
                key={h}
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"
                onClick={() => add(h)}
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

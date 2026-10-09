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
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-sm">
              {v}
              <button
                type="button"
                className="rounded-full px-1.5 text-slate-500 hover:bg-slate-200"
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
            className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            {hits.map((h) => (
              <button
                key={h}
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
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

import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { type Area } from '../db'
import { resolveAreaId } from '../utils/areas'
import { sentenceCase } from '../utils/format'

interface AreaChipsProps {
  areas: Area[]
  selectedAreaId: number | null
  onSelect: (areaId: number | null) => void
  counts: Map<number, number>
  totalCount: number
}

export function AreaChips({
  areas,
  selectedAreaId,
  onSelect,
  counts,
  totalCount,
}: AreaChipsProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const chipBase =
    'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-[0.98]'

  async function submitArea() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const areaId = await resolveAreaId(trimmed)
      if (areaId === undefined) return
      setName('')
      setAdding(false)
      onSelect(areaId)
    } catch {
      alert('Impossibile creare l\'area. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  function cancelAdd() {
    setName('')
    setAdding(false)
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Aree
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
            aria-label="Nuova area"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {adding && (
        <form
          className="mb-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submitArea()
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => setName(sentenceCase(e.target.value))}
            placeholder="Nome nuova area"
            autoFocus
            disabled={saving}
            className="min-w-0 flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white disabled:opacity-40"
            aria-label="Salva area"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancelAdd}
            disabled={saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
            aria-label="Annulla"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filtra per area"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedAreaId === null}
          onClick={() => onSelect(null)}
          className={`${chipBase} ${
            selectedAreaId === null
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>Tutte</span>
          <span
            className={`rounded-full px-1.5 py-px text-xs tabular-nums ${
              selectedAreaId === null
                ? 'bg-indigo-500/50 text-indigo-50'
                : 'bg-white/80 text-slate-500'
            }`}
          >
            {totalCount}
          </span>
        </button>
        {areas.map((area) => {
          if (!area.id) return null
          const count = counts.get(area.id) ?? 0
          const active = selectedAreaId === area.id
          return (
            <button
              key={area.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(area.id!)}
              className={`${chipBase} ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{area.name}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-px text-xs tabular-nums ${
                    active
                      ? 'bg-indigo-500/50 text-indigo-50'
                      : 'bg-white/80 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { type Area } from '../db'
import { resolveAreaId } from '../utils/areas'
import { sentenceCase } from '../utils/format'

interface AreaSidebarProps {
  areas: Area[]
  selectedAreaId: number | null
  onSelect: (areaId: number | null) => void
  counts: Map<number, number>
  totalCount: number
}

export function AreaSidebar({
  areas,
  selectedAreaId,
  onSelect,
  counts,
  totalCount,
}: AreaSidebarProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const btnBase =
    'flex w-full items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-left text-[10px] font-medium leading-none transition whitespace-nowrap'

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
    <aside
      className="flex w-max max-w-[46%] shrink-0 flex-col gap-0.5 border-r border-slate-200/80 pr-2"
      aria-label="Aree"
    >
      <div className="mb-0.5 flex items-center justify-between gap-1 px-1">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          Aree
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
            aria-label="Nuova area"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {adding && (
        <form
          className="mb-0.5 flex items-center gap-0.5"
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
            placeholder="Nome area"
            autoFocus
            disabled={saving}
            className="min-w-0 flex-1 rounded-md border border-indigo-200 bg-white px-1.5 py-1 text-[10px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white disabled:opacity-40"
            aria-label="Salva area"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={cancelAdd}
            disabled={saving}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            aria-label="Annulla"
          >
            <X className="h-3 w-3" />
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`${btnBase} ${
          selectedAreaId === null
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span>Tutte</span>
        <span
          className={`shrink-0 text-[9px] tabular-nums ${
            selectedAreaId === null ? 'text-indigo-200' : 'text-slate-400'
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
            onClick={() => onSelect(area.id!)}
            className={`${btnBase} ${
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{area.name}</span>
            {count > 0 && (
              <span
                className={`shrink-0 text-[9px] tabular-nums ${
                  active ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </aside>
  )
}

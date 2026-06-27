import { useId } from 'react'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'

import { sentenceCase } from '../utils/format'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

interface AreaInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** Campo testo con suggerimenti dalle aree già create */
export function AreaInput({ value, onChange, disabled }: AreaInputProps) {
  const listId = useId()
  const areas = useDexieLiveQuery(() => db.areas.orderBy('name').toArray())

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Area
      </label>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(sentenceCase(e.target.value))}
        placeholder="Es. Casa, Auto, Abbonamenti, Famiglia…"
        className={inputClass}
        disabled={disabled}
      />
      <datalist id={listId}>
        {areas?.map((a) => (
          <option key={a.id} value={a.name} />
        ))}
      </datalist>
      <p className="mt-1 text-xs text-slate-400">
        Raggruppa note, impegni e spese per ambito di vita
      </p>
    </div>
  )
}

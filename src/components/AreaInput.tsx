import { useState } from 'react'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { sentenceCase } from '../utils/format'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

const chipBase =
  'flex shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-40'

interface AreaInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** Selettore area con chip tappabili + campo per nome nuovo */
export function AreaInput({ value, onChange, disabled }: AreaInputProps) {
  const areas = useDexieLiveQuery(() => db.areas.orderBy('name').toArray())
  const [customMode, setCustomMode] = useState(false)

  const trimmed = value.trim()
  const matchedArea = areas?.find(
    (a) => a.name.toLowerCase() === trimmed.toLowerCase(),
  )
  const showCustomInput =
    customMode || (trimmed.length > 0 && matchedArea == null)

  function selectArea(name: string) {
    if (disabled) return
    onChange(name)
    setCustomMode(false)
  }

  function handleChipClick(name: string) {
    if (disabled) return
    if (
      matchedArea?.name.toLowerCase() === name.toLowerCase() &&
      !customMode
    ) {
      onChange('')
      return
    }
    selectArea(name)
  }

  function openCustom() {
    if (disabled) return
    setCustomMode(true)
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        Area
      </label>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Seleziona area"
      >
        {areas?.map((area) => {
          const active =
            !showCustomInput &&
            matchedArea?.id === area.id
          return (
            <button
              key={area.id}
              type="button"
              role="option"
              aria-selected={active}
              disabled={disabled}
              onClick={() => handleChipClick(area.name)}
              className={`${chipBase} ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {area.name}
            </button>
          )
        })}
        <button
          type="button"
          role="option"
          aria-selected={showCustomInput}
          disabled={disabled}
          onClick={openCustom}
          className={`${chipBase} ${
            showCustomInput
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Altra…
        </button>
      </div>

      {showCustomInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(sentenceCase(e.target.value))}
          placeholder="Nome nuova area"
          className={`mt-2 ${inputClass}`}
          disabled={disabled}
          autoFocus={customMode && !trimmed}
        />
      )}

      <p className="mt-1.5 text-xs text-slate-400">
        Raggruppa note, impegni e spese per ambito di vita
      </p>
    </div>
  )
}

import { Check } from 'lucide-react'

interface ImpegnoDoneToggleProps {
  done: boolean
  compact?: boolean
  onToggle: () => void
  /** Ricorrenti: solo segna fatto (avanza data), non si annulla */
  advanceOnly?: boolean
  /** Periodo non ancora scaduto: non si può spuntare */
  checkDisabled?: boolean
  /** completedAt salvato ma periodo non valido: mostra spunta e permetti deselezione */
  storedDone?: boolean
}

export function ImpegnoDoneToggle({
  done,
  compact = false,
  onToggle,
  advanceOnly = false,
  checkDisabled = false,
  storedDone = false,
}: ImpegnoDoneToggleProps) {
  const visualDone = done || storedDone
  const canUncheck = visualDone && !advanceOnly
  const canCheck = !visualDone && !checkDisabled

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation()
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (canUncheck || canCheck) onToggle()
      }}
      aria-label={
        visualDone
          ? advanceOnly
            ? 'Periodo completato'
            : 'Deseleziona — segna come da fare'
          : checkDisabled
            ? 'Periodo non ancora scaduto'
            : 'Segna come fatto'
      }
      className={`relative flex shrink-0 touch-manipulation flex-col items-center gap-0.5 self-center ${
        compact ? 'px-0.5' : 'px-1'
      } ${done && advanceOnly ? 'opacity-80' : ''} ${
        checkDisabled && !visualDone ? 'opacity-50' : ''
      } ${storedDone && !done ? 'opacity-90' : ''}`}
    >
      <span
        className={`flex items-center justify-center rounded-md border-2 ${
          compact ? 'h-4 w-4' : 'h-5 w-5'
        } ${
          visualDone
            ? storedDone && !done
              ? 'border-amber-500 bg-amber-500 text-white'
              : 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-white hover:border-emerald-400'
        }`}
      >
        {visualDone && (
          <Check
            className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}
            strokeWidth={3}
          />
        )}
      </span>
      <span
        className={`font-medium leading-none text-slate-500 ${
          compact ? 'text-[7px]' : 'text-[9px]'
        }`}
      >
        Fatto
      </span>
    </button>
  )
}

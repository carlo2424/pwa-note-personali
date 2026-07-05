import { Check } from 'lucide-react'

interface ImpegnoDoneToggleProps {
  done: boolean
  compact?: boolean
  onToggle: () => void
  /** Ricorrenti: solo segna fatto (avanza data), non si annulla */
  advanceOnly?: boolean
}

export function ImpegnoDoneToggle({
  done,
  compact = false,
  onToggle,
  advanceOnly = false,
}: ImpegnoDoneToggleProps) {
  const canUncheck = done && !advanceOnly

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (canUncheck || !done) onToggle()
      }}
      aria-label={
        done
          ? advanceOnly
            ? 'Periodo completato'
            : 'Segna come da fare'
          : 'Segna come fatto'
      }
      className={`flex shrink-0 flex-col items-center gap-0.5 self-center ${
        compact ? 'px-0.5' : 'px-1'
      } ${done && advanceOnly ? 'opacity-80' : ''}`}
    >
      <span
        className={`flex items-center justify-center rounded-md border-2 ${
          compact ? 'h-4 w-4' : 'h-5 w-5'
        } ${
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-white hover:border-emerald-400'
        }`}
      >
        {done && (
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

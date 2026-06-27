import { CalendarDays, StickyNote, Wallet } from 'lucide-react'

interface AddChooserProps {
  onAddNote: () => void
  onAddEvent: () => void
  onAddExpense: () => void
  areaName?: string
}

const options = [
  {
    id: 'note',
    label: 'Nota',
    description: 'Appunto o promemoria testuale',
    icon: StickyNote,
    iconClass: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'event',
    label: 'Impegno',
    description: 'Con data inizio e data fine (anche da una nota)',
    icon: CalendarDays,
    iconClass: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'expense',
    label: 'Spesa',
    description: 'Pagamento una tantum (es. assicurazione annuale pagata una volta)',
    icon: Wallet,
    iconClass: 'bg-rose-100 text-rose-700',
  },
] as const

/** Scelta del tipo di elemento da creare (un solo tap) */
export function AddChooser({
  onAddNote,
  onAddEvent,
  onAddExpense,
  areaName,
}: AddChooserProps) {
  const handlers = {
    note: onAddNote,
    event: onAddEvent,
    expense: onAddExpense,
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-sm text-slate-500">
        {areaName
          ? `Aggiungi qualcosa in ${areaName}`
          : 'Scegli cosa vuoi aggiungere'}
      </p>
      {options.map((opt) => {
        const Icon = opt.icon
        return (
          <button
            key={opt.id}
            type="button"
            onClick={handlers[opt.id]}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 active:scale-[.99]"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${opt.iconClass}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

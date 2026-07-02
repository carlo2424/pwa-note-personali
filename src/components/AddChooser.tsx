import { CalendarDays, ListChecks, StickyNote, Wallet } from 'lucide-react'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'

interface AddChooserProps {
  onAddNote: () => void
  onAddChecklist: () => void
  onAddEvent: () => void
  onAddExpense: () => void
  areaName?: string
}

const options = [
  {
    id: 'note',
    label: 'Nota',
    description: 'Appunto testuale libero',
    icon: StickyNote,
    style: ITEM_TYPE_STYLE.note,
  },
  {
    id: 'checklist',
    label: 'Lista',
    description: 'To-do con voci da spuntare',
    icon: ListChecks,
    style: ITEM_TYPE_STYLE.note,
  },
  {
    id: 'event',
    label: 'Impegno',
    description: 'Con data inizio e data fine',
    icon: CalendarDays,
    style: ITEM_TYPE_STYLE.event,
  },
  {
    id: 'expense',
    label: 'Spesa',
    description: 'Pagamento una tantum',
    icon: Wallet,
    style: ITEM_TYPE_STYLE.expense,
  },
] as const

/** Scelta del tipo di elemento da creare (un solo tap) */
export function AddChooser({
  onAddNote,
  onAddChecklist,
  onAddEvent,
  onAddExpense,
  areaName,
}: AddChooserProps) {
  const handlers = {
    note: onAddNote,
    checklist: onAddChecklist,
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
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition active:scale-[.99] ${opt.style.card} ${opt.style.cardHover}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${opt.style.navIconBg}`}
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

import { Archive, Pencil } from 'lucide-react'
import { db, type Event, type Expense, type PaymentMethod } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { archiveExpense } from '../utils/expenseArchive'
import { formatAmount, formatDate, sentenceCase } from '../utils/format'

const METHOD_LABELS: Record<PaymentMethod, string> = {
  carta: 'Carta',
  bonifico: 'Bonifico',
  contanti: 'Contanti',
  altro: 'Altro',
}

const METHOD_COLOR: Record<PaymentMethod, string> = {
  carta: 'bg-indigo-100 text-indigo-700',
  bonifico: 'bg-sky-100 text-sky-700',
  contanti: 'bg-emerald-100 text-emerald-700',
  altro: 'bg-slate-100 text-slate-600',
}

interface ExpenseDetailBodyProps {
  expense: Expense
  onEdit: () => void
  onOpenEvent?: (event: Event) => void
  onArchived?: () => void
  compact?: boolean
}

export function ExpenseDetailBody({
  expense,
  onEdit,
  onOpenEvent,
  onArchived,
  compact = false,
}: ExpenseDetailBodyProps) {
  const cards = useDexieLiveQuery(() => db.paymentCards.toArray())
  const linkedEvent = useDexieLiveQuery(
    () => (expense.eventId ? db.events.get(expense.eventId) : undefined),
    [expense.eventId],
  )
  const card = cards?.find((c) => c.id === expense.cardId)
  const isIncome = expense.amount < 0
  const method = (expense.paymentMethod ?? 'altro') as PaymentMethod
  const isFromEvent = !!expense.eventId

  const gap = compact ? 'space-y-2' : 'space-y-3'
  const row = compact ? 'px-2.5 py-2 text-xs' : 'px-4 py-3'
  const btn = compact
    ? 'gap-1 rounded-lg py-1.5 text-[10px]'
    : 'gap-2 rounded-xl py-2 text-sm'
  const icon = compact ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <div className={gap}>
      <div className={`bg-slate-50 text-center ${compact ? 'rounded-lg p-2.5' : 'rounded-2xl p-4'}`}>
        <p className={`font-medium uppercase tracking-wide text-slate-400 ${compact ? 'text-[9px]' : 'text-xs'}`}>
          {isIncome ? 'Entrata' : 'Spesa'}
        </p>
        <p
          className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'} ${compact ? 'mt-0.5 text-lg' : 'mt-1 text-2xl'}`}
        >
          {isIncome ? '+' : '−'}
          {formatAmount(Math.abs(expense.amount))}
        </p>
      </div>

      <div className={`divide-y divide-slate-100 rounded-lg border border-slate-100 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div className={`flex justify-between ${row}`}>
          <span className="text-slate-500">Data</span>
          <span className="font-medium text-slate-800">
            {formatDate(new Date(expense.date).getTime())}
          </span>
        </div>
        <div className={`flex justify-between ${row}`}>
          <span className="text-slate-500">Categoria</span>
          <span className="font-medium text-slate-800">{expense.category}</span>
        </div>
        <div className={`flex items-center justify-between ${row}`}>
          <span className="text-slate-500">Pagamento</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${METHOD_COLOR[method]}`}
          >
            {METHOD_LABELS[method]}
          </span>
        </div>
        {card && (
          <div className={`flex justify-between ${row}`}>
            <span className="text-slate-500">Carta</span>
            <span className="font-medium text-slate-800">
              {card.name}
              {card.digitsEnd ? ` ····${card.digitsEnd}` : ''}
            </span>
          </div>
        )}
        {isFromEvent && linkedEvent && (
          <div className={`flex justify-between ${row}`}>
            <span className="text-slate-500">Origine</span>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              Impegno: {sentenceCase(linkedEvent.title)}
            </span>
          </div>
        )}
      </div>

      {isFromEvent && (
        <p className={`text-slate-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Generata da un impegno. Modifica il costo dall&apos;impegno collegato.
        </p>
      )}

      <div className={`flex gap-2 border-t border-slate-100 ${compact ? 'pt-2' : 'pt-3'}`}>
        <button
          type="button"
          onClick={() => archiveExpense(expense, onArchived)}
          className={`flex flex-1 items-center justify-center border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 ${btn}`}
        >
          <Archive className={icon} /> Archivia
        </button>
        {isFromEvent && linkedEvent && onOpenEvent ? (
          <button
            type="button"
            onClick={() => onOpenEvent(linkedEvent)}
            className={`flex flex-1 items-center justify-center bg-indigo-600 font-medium text-white hover:bg-indigo-700 ${btn}`}
          >
            <Pencil className={icon} /> Vedi impegno
          </button>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className={`flex flex-1 items-center justify-center bg-indigo-600 font-medium text-white hover:bg-indigo-700 ${btn}`}
          >
            <Pencil className={icon} /> Modifica
          </button>
        )}
      </div>
    </div>
  )
}

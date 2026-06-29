import type { Event, Expense, PaymentMethod } from '../db'
import { formatAmount, formatDate } from '../utils/format'
import { ExpenseDetailBody } from './ExpenseDetailBody'
import { ExpandableCard } from './ExpandableCard'

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

interface ExpenseExpandableRowProps {
  expense: Expense
  onEdit: () => void
  onOpenEvent?: (event: Event) => void
  areaName?: string
  compact?: boolean
  /** In Home globale: area in titolo, data e descrizione nel sottotitolo */
  promoteAreaTitle?: boolean
}

export function ExpenseExpandableRow({
  expense,
  onEdit,
  onOpenEvent,
  areaName,
  compact = false,
  promoteAreaTitle = false,
}: ExpenseExpandableRowProps) {
  const isIncome = expense.amount < 0
  const method = (expense.paymentMethod ?? 'altro') as PaymentMethod
  const expenseDate = formatDate(new Date(expense.date).getTime())
  const meta = `${expense.category} · ${expenseDate}`

  const title = promoteAreaTitle && areaName
    ? areaName
    : expense.description
  const subtitle = promoteAreaTitle && areaName
    ? `${expenseDate} · ${expense.description}`
    : areaName
      ? `${areaName} · ${meta}`
      : meta

  return (
    <ExpandableCard
      compact={compact}
      icon={
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg font-bold ${isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} ${compact ? 'h-7 w-7 text-xs' : 'h-9 w-9 rounded-xl text-sm'}`}
        >
          {isIncome ? '+' : '−'}
        </div>
      }
      title={title}
      subtitle={subtitle}
      badge={
        expense.eventId ? (
          <span
            className={`shrink-0 rounded-full bg-violet-100 font-medium text-violet-700 ${compact ? 'px-1.5 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]'}`}
          >
            Da impegno
          </span>
        ) : (
          <span
            className={`shrink-0 rounded-full font-medium ${METHOD_COLOR[method]} ${compact ? 'px-1.5 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]'}`}
          >
            {METHOD_LABELS[method]}
          </span>
        )
      }
      trailing={
        <span
          className={`shrink-0 font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'} ${compact ? 'text-[10px]' : 'text-sm'}`}
        >
          {formatAmount(Math.abs(expense.amount))}
        </span>
      }
    >
      <ExpenseDetailBody
        expense={expense}
        onEdit={onEdit}
        onOpenEvent={onOpenEvent}
        areaName={areaName}
        compact={compact}
      />
    </ExpandableCard>
  )
}

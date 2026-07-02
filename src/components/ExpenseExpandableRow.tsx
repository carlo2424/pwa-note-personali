import type { Event, Expense, PaymentMethod } from '../db'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { daysUntil } from '../utils/countdown'
import { formatAmount, formatDate, formatModifiedAt, sentenceCase } from '../utils/format'
import { expenseHasOccurred } from '../utils/monthExpenseTotals'
import { summarizeText } from '../utils/textSummary'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import { ExpenseDetailBody } from './ExpenseDetailBody'
import { ExpandableCard } from './ExpandableCard'
import { ItemIconCircle } from './ItemIconCircle'

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
  const linkedEvent = useDexieLiveQuery(
    async () => {
      if (!expense.eventId) return null
      return (await db.events.get(expense.eventId)) ?? null
    },
    [expense.eventId],
  )

  const isIncome = expense.amount < 0
  const isUpcoming = !isIncome && !expenseHasOccurred(expense)
  const upcomingDays = isUpcoming ? daysUntil(expense.date) : 0
  const method = (expense.paymentMethod ?? 'altro') as PaymentMethod
  const expenseDate = formatDate(new Date(expense.date).getTime())
  const meta = `${expense.category} · ${expenseDate}`
  const descriptionExcerpt = summarizeText(expense.description)
  const categoryLabel = sentenceCase(expense.category)

  const title = promoteAreaTitle && areaName
    ? areaName
    : expense.description

  let subtitle: string
  if (promoteAreaTitle && areaName) {
    const parts = [expenseDate]
    if (categoryLabel && categoryLabel.toLowerCase() !== descriptionExcerpt.toLowerCase()) {
      parts.push(categoryLabel)
    }
    if (descriptionExcerpt) parts.push(descriptionExcerpt)
    if (compact) parts.push(formatModifiedAt(expense.createdAt))
    subtitle = parts.join(' · ')
  } else {
    const parts: string[] = []
    if (areaName) parts.push(areaName)
    parts.push(meta)
    if (descriptionExcerpt) parts.push(descriptionExcerpt)
    if (compact) parts.push(formatModifiedAt(expense.createdAt))
    subtitle = parts.join(' · ')
  }

  const iconNode = linkedEvent ? (
    <ItemIconCircle
      icon={linkedEvent.icon}
      color={linkedEvent.color}
      compact={compact}
    />
  ) : (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white font-bold ${
        isIncome ? 'text-emerald-600' : 'text-rose-600'
      } ${compact ? 'h-7 w-7 text-xs' : 'h-9 w-9 rounded-xl text-sm'}`}
    >
      {isIncome ? '+' : '−'}
    </div>
  )

  return (
    <ExpandableCard
      compact={compact}
      subtitleMultiline={compact}
      containerClassName={ITEM_TYPE_STYLE.expense.card}
      icon={iconNode}
      title={title}
      subtitle={subtitle}
      badge={
        isUpcoming ? (
          <span
            className={`shrink-0 rounded-full bg-amber-100 font-medium text-amber-800 ${compact ? 'px-1.5 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]'}`}
          >
            Tra {upcomingDays}{' '}
            {upcomingDays === 1 ? 'giorno' : 'giorni'}
          </span>
        ) : expense.eventId ? (
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

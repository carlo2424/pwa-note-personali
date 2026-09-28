import { useMemo } from 'react'
import type { Event, Expense } from '../db'
import {
  formatMonthIncomingOverviewLabel,
  listMonthIncomingOverviewItems,
} from '../utils/monthIncomeTotals'

interface MonthIncomingOverviewListProps {
  expenses: Expense[]
  events?: Event[]
  className?: string
  maxHeight?: boolean
}

export function MonthIncomingOverviewList({
  expenses,
  events = [],
  className = '',
  maxHeight = false,
}: MonthIncomingOverviewListProps) {
  const items = useMemo(
    () => listMonthIncomingOverviewItems(expenses, events),
    [expenses, events],
  )

  if (items.length === 0) return null

  const paidClass =
    'text-emerald-200/90 line-through decoration-emerald-100/80'
  const pendingClass = 'text-white'

  return (
    <div
      className={`mt-2 space-y-0.5 border-t border-emerald-500/30 pt-2 ${
        maxHeight ? 'max-h-48 overflow-y-auto pr-0.5' : ''
      } ${className}`}
    >
      {items.map((item) => (
        <p
          key={`${item.eventId ?? item.label}-${item.chargeDate}`}
          className={`text-[11px] font-medium leading-snug ${
            item.occurred ? paidClass : pendingClass
          }`}
        >
          {formatMonthIncomingOverviewLabel(item)}
        </p>
      ))}
    </div>
  )
}

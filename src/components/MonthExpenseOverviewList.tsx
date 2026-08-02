import { useMemo } from 'react'
import type { Event, Expense } from '../db'
import {
  formatMonthExpenseOverviewLabel,
  listMonthPositiveExpenses,
} from '../utils/monthExpenseTotals'

interface MonthExpenseOverviewListProps {
  expenses: Expense[]
  events?: Event[]
  className?: string
  /** Su sfondo rose-600 (tab Spese) o card chiara Home */
  variant?: 'dark' | 'light'
  maxHeight?: boolean
}

/** Elenco voci spesa del mese nella card riepilogo (pagate barrate). */
export function MonthExpenseOverviewList({
  expenses,
  events = [],
  className = '',
  variant = 'dark',
  maxHeight = false,
}: MonthExpenseOverviewListProps) {
  const items = useMemo(
    () => listMonthPositiveExpenses(expenses, events),
    [expenses, events],
  )

  if (items.length === 0) return null

  const paidClass =
    variant === 'dark'
      ? 'text-rose-200/90 line-through decoration-rose-100/80'
      : 'text-slate-400 line-through decoration-slate-300'
  const pendingClass = variant === 'dark' ? 'text-white' : 'text-slate-700'

  return (
    <div
      className={`mt-2 space-y-0.5 border-t pt-2 ${
        variant === 'dark' ? 'border-rose-500/30' : 'border-rose-200/80'
      } ${maxHeight ? 'max-h-48 overflow-y-auto pr-0.5' : ''} ${className}`}
    >
      {items.map(({ expense, occurred }) => (
        <p
          key={expense.id ?? `${expense.date}-${expense.description}`}
          className={`text-[11px] font-medium leading-snug ${
            occurred ? paidClass : pendingClass
          }`}
        >
          {formatMonthExpenseOverviewLabel(expense, occurred)}
        </p>
      ))}
    </div>
  )
}

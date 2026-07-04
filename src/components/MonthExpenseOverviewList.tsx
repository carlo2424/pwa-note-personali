import { useMemo } from 'react'
import type { Expense } from '../db'
import {
  formatMonthExpenseOverviewLabel,
  listMonthPositiveExpenses,
} from '../utils/monthExpenseTotals'

interface MonthExpenseOverviewListProps {
  expenses: Expense[]
  className?: string
}

/** Elenco voci spesa del mese nella card riepilogo (pagate barrate). */
export function MonthExpenseOverviewList({
  expenses,
  className = '',
}: MonthExpenseOverviewListProps) {
  const items = useMemo(
    () => listMonthPositiveExpenses(expenses),
    [expenses],
  )

  if (items.length === 0) return null

  return (
    <div
      className={`mt-2 space-y-0.5 border-t border-rose-500/30 pt-2 ${className}`}
    >
      {items.map(({ expense, occurred }) => (
        <p
          key={expense.id ?? `${expense.date}-${expense.description}`}
          className={`text-[11px] font-medium leading-snug ${
            occurred
              ? 'text-rose-200/90 line-through decoration-rose-100/80'
              : 'text-white'
          }`}
        >
          {formatMonthExpenseOverviewLabel(expense, occurred)}
        </p>
      ))}
    </div>
  )
}

import { Wallet } from 'lucide-react'
import type { Event, Expense } from '../db'
import { formatAmount } from '../utils/format'
import { ExpandableCard } from './ExpandableCard'
import { ExpenseExpandableRow } from './ExpenseExpandableRow'
import { areaNameById } from '../utils/areas'

interface MonthExpenseSummaryProps {
  monthLabel: string
  expenses: Expense[]
  areas: { id?: number; name: string }[]
  onEdit: (expense: Expense) => void
  onOpenEvent?: (event: Event) => void
  defaultExpanded?: boolean
  hideAreaName?: boolean
  compact?: boolean
  /** Solo contenuto interno, senza macro-card (per CollapsibleSection) */
  nested?: boolean
}

export function MonthExpenseSummary({
  monthLabel,
  expenses,
  areas,
  onEdit,
  onOpenEvent,
  defaultExpanded = false,
  hideAreaName = false,
  compact = false,
  nested = false,
}: MonthExpenseSummaryProps) {
  const totalSpese = expenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0)
  const totalEntrate = expenses
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + Math.abs(e.amount), 0)
  const bilancio = totalEntrate - totalSpese

  const body = (
    <>
      {(totalEntrate > 0 || expenses.length > 0) && (
        <div
          className={`flex flex-wrap gap-x-3 text-slate-500 ${compact ? 'px-0.5 pb-1 text-[10px]' : 'pb-1.5 text-xs'}`}
        >
          {totalEntrate > 0 && (
            <span>
              Entrate{' '}
              <span className="font-semibold text-emerald-600">
                +{formatAmount(totalEntrate)}
              </span>
            </span>
          )}
          <span>
            Bilancio{' '}
            <span
              className={`font-semibold ${bilancio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {bilancio >= 0 ? '+' : '−'}
              {formatAmount(Math.abs(bilancio))}
            </span>
          </span>
        </div>
      )}
      <ul className={compact ? 'space-y-1' : 'space-y-2'}>
        {expenses.map((expense) => (
          <li key={expense.id}>
            <ExpenseExpandableRow
              expense={expense}
              compact={compact}
              areaName={
                hideAreaName
                  ? undefined
                  : areaNameById(areas, expense.areaId)
              }
              onEdit={() => onEdit(expense)}
              onOpenEvent={onOpenEvent}
            />
          </li>
        ))}
      </ul>
    </>
  )

  if (nested) return body

  return (
    <ExpandableCard
      compact={compact}
      defaultExpanded={defaultExpanded}
      containerClassName="border-slate-100 bg-white"
      icon={
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 ${compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl'}`}
        >
          <Wallet className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </div>
      }
      title={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
      subtitle={`${expenses.length} ${expenses.length === 1 ? 'movimento' : 'movimenti'}`}
      trailing={
        <span
          className={`shrink-0 font-bold text-rose-600 ${compact ? 'text-[10px]' : 'text-xs'}`}
        >
          {formatAmount(totalSpese)}
        </span>
      }
    >
      {body}
    </ExpandableCard>
  )
}

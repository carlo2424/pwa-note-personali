import { Wallet } from 'lucide-react'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import { formatAmount, sentenceCase } from '../utils/format'
import {
  formatUpcomingExpenseLabel,
  type UpcomingMonthExpense,
} from '../utils/monthExpenseTotals'

interface HomeSpotlightCardsProps {
  monthLabel: string
  monthPaid: number
  monthPlanned: number
  upcomingExpenses: UpcomingMonthExpense[]
  expenseDelta: number
  prevMonthExpenses: number
  onGoToExpenses: () => void
}

/** Riepilogo spese del mese — unica card sotto AREE in Home (3 righe) */
export function HomeSpotlightCards({
  monthLabel,
  monthPaid,
  monthPlanned,
  upcomingExpenses,
  expenseDelta,
  prevMonthExpenses,
  onGoToExpenses,
}: HomeSpotlightCardsProps) {
  const upcomingLabel = upcomingExpenses
    .map((item) => formatUpcomingExpenseLabel(item.amount, item.daysUntil))
    .join(' · ')

  return (
    <button
      type="button"
      onClick={onGoToExpenses}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left shadow-sm hover:border-rose-200 active:scale-[0.99] ${ITEM_TYPE_STYLE.expense.card}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
        <Wallet className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
            Spese del mese
          </p>
          {monthPlanned > 0 && (
            <p className="shrink-0 text-[11px] text-slate-500">
              Prev.{' '}
              <span className="font-semibold text-slate-700">
                {formatAmount(monthPlanned)}
              </span>
            </p>
          )}
        </div>
        <p className="text-base font-bold leading-tight text-rose-600">
          {formatAmount(monthPaid)}
          <span className="ml-1.5 text-xs font-normal capitalize text-slate-400">
            {sentenceCase(monthLabel)}
          </span>
        </p>
        {(upcomingLabel || prevMonthExpenses > 0) && (
          <p className="truncate text-[11px] font-medium leading-tight">
            {upcomingLabel && (
              <span className="text-amber-700">{upcomingLabel}</span>
            )}
            {upcomingLabel && prevMonthExpenses > 0 && (
              <span className="text-slate-300"> · </span>
            )}
            {prevMonthExpenses > 0 && (
              <span
                className={
                  expenseDelta > 0
                    ? 'text-rose-400'
                    : expenseDelta < 0
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                }
              >
                {expenseDelta > 0 ? '+' : ''}
                {formatAmount(expenseDelta)} vs mese scorso
              </span>
            )}
          </p>
        )}
      </div>
    </button>
  )
}

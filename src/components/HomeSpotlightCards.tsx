import { Wallet } from 'lucide-react'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import type { HomeDeadlineLine } from '../utils/homeSpotlight'
import { formatAmount, sentenceCase } from '../utils/format'
import { HomeDeadlineLines } from './HomeDeadlineLines'

interface HomeSpotlightCardsProps {
  monthLabel: string
  monthPaid: number
  monthPaidCount: number
  monthPlanned: number
  deadlineLines?: HomeDeadlineLine[]
  onGoToExpenses: () => void
}

/** Riepilogo spese del mese — card compatta in Home */
export function HomeSpotlightCards({
  monthLabel,
  monthPaid,
  monthPaidCount,
  monthPlanned,
  deadlineLines = [],
  onGoToExpenses,
}: HomeSpotlightCardsProps) {
  return (
    <button
      type="button"
      onClick={onGoToExpenses}
      className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left shadow-sm hover:border-rose-200 active:scale-[0.99] ${ITEM_TYPE_STYLE.expense.card}`}
    >
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <span className="text-[8px] font-semibold uppercase leading-none tracking-wide text-slate-500">
          Spesa
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <Wallet className="h-4 w-4" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
            Spese del mese
          </p>
          <p className="shrink-0 text-right text-[11px] leading-tight text-slate-500">
            Spese previste{' '}
            <span className="font-semibold text-slate-700">
              {formatAmount(monthPlanned)}
            </span>
          </p>
        </div>
        <p className="mt-0.5 text-base font-bold leading-tight text-rose-600">
          {formatAmount(monthPaid)}
        </p>
        <p className="text-[10px] leading-snug text-slate-500">
          Sostenuto fino a oggi
          {monthPaidCount > 0
            ? ` · ${monthPaidCount} ${monthPaidCount === 1 ? 'spesa' : 'spese'}`
            : ''}
          <span className="capitalize text-slate-400"> · {sentenceCase(monthLabel)}</span>
        </p>
        {deadlineLines.length > 0 && (
          <div className="mt-1.5">
            <HomeDeadlineLines lines={deadlineLines} compact maxLines={4} />
          </div>
        )}
      </div>
    </button>
  )
}

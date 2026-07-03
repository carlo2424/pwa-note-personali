import { Wallet } from 'lucide-react'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import { formatAmount, sentenceCase } from '../utils/format'

interface HomeSpotlightCardsProps {
  monthLabel: string
  monthPaid: number
  monthPlanned: number
  onGoToExpenses: () => void
}

/** Riepilogo spese del mese — card compatta in Home (2 righe) */
export function HomeSpotlightCards({
  monthLabel,
  monthPaid,
  monthPlanned,
  onGoToExpenses,
}: HomeSpotlightCardsProps) {
  return (
    <button
      type="button"
      onClick={onGoToExpenses}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left shadow-sm hover:border-rose-200 active:scale-[0.99] ${ITEM_TYPE_STYLE.expense.card}`}
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
          <span className="ml-1.5 text-xs font-normal capitalize text-slate-400">
            {sentenceCase(monthLabel)}
          </span>
        </p>
      </div>
    </button>
  )
}

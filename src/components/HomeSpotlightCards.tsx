import { Wallet } from 'lucide-react'
import { formatAmount, sentenceCase } from '../utils/format'

interface HomeSpotlightCardsProps {
  monthLabel: string
  monthPaid: number
  monthPlanned: number
  expenseDelta: number
  prevMonthExpenses: number
  onGoToExpenses: () => void
}

/** Riepilogo spese del mese — unica card sotto AREE in Home */
export function HomeSpotlightCards({
  monthLabel,
  monthPaid,
  monthPlanned,
  expenseDelta,
  prevMonthExpenses,
  onGoToExpenses,
}: HomeSpotlightCardsProps) {
  return (
    <button
      type="button"
      onClick={onGoToExpenses}
      className="w-full rounded-xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm hover:border-rose-200 active:scale-[0.99]"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-rose-600">
            {formatAmount(monthPaid)}
          </p>
          <p className="mt-0.5 text-xs capitalize text-slate-500">
            {sentenceCase(monthLabel)}
            {monthPlanned > 0
              ? ` · prev. ${formatAmount(monthPlanned)}`
              : ''}
          </p>
        </div>
      </div>
      {prevMonthExpenses > 0 && (
        <p
          className={`mt-2 pl-[2.875rem] text-[10px] font-medium ${expenseDelta > 0 ? 'text-rose-400' : expenseDelta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}
        >
          {expenseDelta > 0 ? '+' : ''}
          {formatAmount(expenseDelta)} vs mese scorso
        </p>
      )}
    </button>
  )
}

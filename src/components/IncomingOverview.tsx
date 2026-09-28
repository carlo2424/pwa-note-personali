import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { currentMonthBounds } from '../utils/monthFilter'
import { formatAmount } from '../utils/format'
import {
  computeMonthReceivedPaidTotal,
  computeMonthReceivedUpcomingTotal,
  listMonthIncomingOverviewItems,
} from '../utils/monthIncomeTotals'
import { eventHasReceivable } from '../utils/impegnoMoney'
import { MonthIncomingOverviewList } from './MonthIncomingOverviewList'

/** Riepilogo incassi del mese in tab Impegni */
export function IncomingOverview() {
  const { label: monthLabel } = currentMonthBounds()
  const expenses = useDexieLiveQuery(() => db.expenses.toArray())
  const events = useDexieLiveQuery(() => db.events.toArray())

  const monthReceived = useMemo(
    () => computeMonthReceivedPaidTotal(expenses ?? [], events ?? []),
    [expenses, events],
  )

  const monthUpcoming = useMemo(
    () => computeMonthReceivedUpcomingTotal(expenses ?? [], events ?? []),
    [expenses, events],
  )

  if (expenses === undefined || events === undefined) {
    return null
  }

  const incomingItems = useMemo(
    () => listMonthIncomingOverviewItems(expenses ?? [], events ?? []),
    [expenses, events],
  )

  const showCard =
    (events ?? []).some(eventHasReceivable) ||
    monthReceived > 0 ||
    monthUpcoming > 0 ||
    incomingItems.length > 0

  if (!showCard) return null

  return (
    <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-md shadow-emerald-200">
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/40">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-emerald-100 capitalize">
            Da ricevere · {monthLabel}
          </p>
          <p className="text-2xl font-bold">{formatAmount(monthReceived)}</p>
          <p className="text-[10px] leading-snug text-emerald-100/90">
            Incassato fino a oggi
            {monthUpcoming > 0 && (
              <>
                {' '}
                · Previsti{' '}
                <span className="font-semibold text-white">
                  +{formatAmount(monthUpcoming)}
                </span>
              </>
            )}
          </p>
          <MonthIncomingOverviewList
            expenses={expenses}
            events={events}
            maxHeight
          />
        </div>
      </div>
    </div>
  )
}

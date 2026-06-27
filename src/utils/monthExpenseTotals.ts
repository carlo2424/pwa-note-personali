import type { Event, Expense } from '../db'
import { filterEventImpegni } from './impegno'
import { expenseInCurrentMonth, isoInCurrentMonth } from './monthFilter'

/** Spese già registrate nel mese corrente (importi positivi). */
export function computeMonthPaidTotal(expenses: Expense[]): number {
  return expenses
    .filter((e) => e.amount > 0 && expenseInCurrentMonth(e))
    .reduce((s, e) => s + e.amount, 0)
}

/**
 * Addebiti previsti nel mese: impegni con prossimo addebito nel mese corrente.
 */
export function computeMonthPlannedTotal(events: Event[]): number {
  return filterEventImpegni(events)
    .filter(
      (e) =>
        e.renewalDate &&
        isoInCurrentMonth(e.renewalDate) &&
        e.cost != null &&
        e.cost > 0,
    )
    .reduce((s, e) => s + e.cost!, 0)
}

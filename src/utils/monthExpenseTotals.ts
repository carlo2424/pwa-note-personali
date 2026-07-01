import type { Event, Expense } from '../db'
import { daysUntil, todayIso } from './countdown'
import { formatAmount } from './format'
import { filterEventImpegni } from './impegno'
import { expenseInCurrentMonth, isoInCurrentMonth } from './monthFilter'

export interface UpcomingMonthExpense {
  amount: number
  date: string
  daysUntil: number
}

export function expenseHasOccurred(expense: Pick<Expense, 'date'>): boolean {
  return expense.date <= todayIso()
}

export function formatUpcomingExpenseLabel(
  amount: number,
  daysUntil: number,
): string {
  const giorni = daysUntil === 1 ? 'giorno' : 'giorni'
  return `−${formatAmount(amount)} fra ${daysUntil} ${giorni}`
}

/** Totale spese positive con data già passata (qualsiasi mese). */
export function sumOccurredPositiveExpenses(expenses: Expense[]): number {
  const today = todayIso()
  return expenses
    .filter((e) => e.amount > 0 && e.date <= today)
    .reduce((s, e) => s + e.amount, 0)
}

/** Spese positive future da un elenco (qualsiasi mese). */
export function upcomingFromExpenses(
  expenses: Expense[],
): UpcomingMonthExpense[] {
  const today = todayIso()
  return expenses
    .filter((e) => e.amount > 0 && e.date > today)
    .map((e) => ({
      amount: e.amount,
      date: e.date,
      daysUntil: daysUntil(e.date),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Spese già avvenute nel mese corrente (data ≤ oggi, importi positivi). */
export function computeMonthPaidTotal(expenses: Expense[]): number {
  const today = todayIso()
  return expenses
    .filter(
      (e) => e.amount > 0 && expenseInCurrentMonth(e) && e.date <= today,
    )
    .reduce((s, e) => s + e.amount, 0)
}

/** Spese previste nel mese ma con data futura (non ancora avvenute). */
export function computeMonthUpcomingExpenses(
  expenses: Expense[],
): UpcomingMonthExpense[] {
  return upcomingFromExpenses(expenses).filter((u) =>
    isoInCurrentMonth(u.date),
  )
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

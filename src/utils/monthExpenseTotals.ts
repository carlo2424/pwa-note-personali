import type { Expense } from '../db'
import { daysUntil, todayIso } from './countdown'
import { formatAmount, sentenceCase } from './format'
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

function expenseAmount(expense: Pick<Expense, 'amount'>): number {
  const amount = Number(expense.amount)
  return Number.isFinite(amount) ? amount : 0
}

/** Spese già avvenute nel mese corrente (data ≤ oggi, importi positivi). */
export function computeMonthPaidTotal(expenses: Expense[]): number {
  const today = todayIso()
  return expenses.reduce((sum, expense) => {
    const amount = expenseAmount(expense)
    if (amount <= 0) return sum
    if (!expenseInCurrentMonth(expense) || expense.date > today) return sum
    return sum + amount
  }, 0)
}

/** Numero di spese positive del mese già sostenute (data ≤ oggi). */
export function countMonthPaidExpenses(expenses: Expense[]): number {
  const today = todayIso()
  return expenses.filter(
    (e) =>
      expenseAmount(e) > 0 &&
      expenseInCurrentMonth(e) &&
      e.date <= today,
  ).length
}

/** Spese previste nel mese ma con data futura (non ancora avvenute). */
export function computeMonthUpcomingExpenses(
  expenses: Expense[],
): UpcomingMonthExpense[] {
  return upcomingFromExpenses(expenses).filter((u) =>
    isoInCurrentMonth(u.date),
  )
}

/** Totale spese future nel mese corrente (allineato all'elenco in Home). */
export function computeMonthUpcomingTotal(expenses: Expense[]): number {
  return computeMonthUpcomingExpenses(expenses).reduce((s, u) => s + u.amount, 0)
}

export interface MonthExpenseOverviewItem {
  expense: Expense
  occurred: boolean
}

/** Spese positive del mese corrente, ordinate per data. */
export function listMonthPositiveExpenses(
  expenses: Expense[],
): MonthExpenseOverviewItem[] {
  return expenses
    .filter((e) => e.amount > 0 && expenseInCurrentMonth(e))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.description.localeCompare(b.description, 'it-IT'),
    )
    .map((expense) => ({
      expense,
      occurred: expenseHasOccurred(expense),
    }))
}

export function formatMonthExpenseOverviewLabel(
  expense: Expense,
  occurred: boolean,
): string {
  const desc = sentenceCase(expense.description)
  const amount = formatAmount(expense.amount)
  if (occurred) return `${desc} · ${amount}`
  const days = daysUntil(expense.date)
  const giorni = days === 1 ? 'giorno' : 'giorni'
  return `${desc} · ${amount} fra ${days} ${giorni}`
}

import type { Event, Expense } from '../db'
import { daysUntil, todayIso } from './countdown'
import { eventChargeDate } from './eventExpenses'
import { formatAmount, sentenceCase } from './format'
import { eventInCurrentMonth, expenseInCurrentMonth, isoInCurrentMonth } from './monthFilter'

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

function eventIdsWithPositiveExpense(expenses: Expense[]): Set<number> {
  const ids = new Set<number>()
  for (const e of expenses) {
    if (e.eventId != null && expenseAmount(e) > 0) ids.add(e.eventId)
  }
  return ids
}

function eventCountsAsMonthPaid(ev: Event): boolean {
  const cost = Number(ev.cost)
  if (!Number.isFinite(cost) || cost <= 0) return false
  if (!eventInCurrentMonth(ev)) return false
  return eventChargeDate(ev) <= todayIso()
}

function eventCountsAsMonthUpcoming(ev: Event): boolean {
  const cost = Number(ev.cost)
  if (!Number.isFinite(cost) || cost <= 0) return false
  const charge = eventChargeDate(ev)
  if (!isoInCurrentMonth(charge)) return false
  return charge > todayIso()
}

/** Spese già avvenute nel mese corrente (data ≤ oggi, importi positivi). */
export function computeMonthPaidTotal(
  expenses: Expense[],
  events: Event[] = [],
): number {
  const today = todayIso()
  const linked = eventIdsWithPositiveExpense(expenses)

  let sum = expenses.reduce((acc, expense) => {
    const amount = expenseAmount(expense)
    if (amount <= 0) return acc
    if (!expenseInCurrentMonth(expense) || expense.date > today) return acc
    return acc + amount
  }, 0)

  for (const ev of events) {
    if (!ev.id || linked.has(ev.id)) continue
    if (!eventCountsAsMonthPaid(ev)) continue
    sum += Number(ev.cost) || 0
  }

  return sum
}

/** Numero di spese positive del mese già sostenute (data ≤ oggi). */
export function countMonthPaidExpenses(
  expenses: Expense[],
  events: Event[] = [],
): number {
  const today = todayIso()
  let count = expenses.filter(
    (e) =>
      expenseAmount(e) > 0 &&
      expenseInCurrentMonth(e) &&
      e.date <= today,
  ).length

  const linked = eventIdsWithPositiveExpense(expenses)
  for (const ev of events) {
    if (!ev.id || linked.has(ev.id)) continue
    if (eventCountsAsMonthPaid(ev)) count += 1
  }

  return count
}

/** Spese previste nel mese ma con data futura (non ancora avvenute). */
export function computeMonthUpcomingExpenses(
  expenses: Expense[],
  events: Event[] = [],
): UpcomingMonthExpense[] {
  const linked = eventIdsWithPositiveExpense(expenses)
  const fromExpenses = upcomingFromExpenses(expenses).filter((u) =>
    isoInCurrentMonth(u.date),
  )

  const fromEvents: UpcomingMonthExpense[] = []
  for (const ev of events) {
    if (!ev.id || linked.has(ev.id)) continue
    if (!eventCountsAsMonthUpcoming(ev)) continue
    const charge = eventChargeDate(ev)
    fromEvents.push({
      amount: Number(ev.cost) || 0,
      date: charge,
      daysUntil: daysUntil(charge),
    })
  }

  return [...fromExpenses, ...fromEvents].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
}

/** Totale spese future nel mese corrente (allineato all'elenco in Home). */
export function computeMonthUpcomingTotal(
  expenses: Expense[],
  events: Event[] = [],
): number {
  return computeMonthUpcomingExpenses(expenses, events).reduce(
    (s, u) => s + u.amount,
    0,
  )
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

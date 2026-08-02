import type { Event, Expense } from '../db'
import { daysUntil, todayIso } from './countdown'
import {
  impegnoPaidChargeInCurrentMonth,
  impegnoUpcomingChargeInCurrentMonth,
} from './eventExpenses'
import { formatAmount, sentenceCase } from './format'
import {
  effectiveExpenseChargeDate,
  eventMapById,
  expenseInCurrentMonth,
  expenseInCurrentMonthWithEvents,
  isoInCurrentMonth,
} from './monthFilter'

export { impegnoPaidChargeInCurrentMonth } from './eventExpenses'

export interface UpcomingMonthExpense {
  amount: number
  date: string
  daysUntil: number
}

export function expenseHasOccurred(
  expense: Pick<Expense, 'date'>,
  chargeDate = expense.date,
): boolean {
  return chargeDate <= todayIso()
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
  events: Event[] = [],
): UpcomingMonthExpense[] {
  const today = todayIso()
  const eventMap = eventMapById(events)
  return expenses
    .filter((e) => e.amount > 0)
    .map((e) => ({
      expense: e,
      charge: effectiveExpenseChargeDate(e, eventMap),
    }))
    .filter(({ charge }) => charge > today)
    .map(({ expense, charge }) => ({
      amount: expense.amount,
      date: charge,
      daysUntil: daysUntil(charge),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function expenseAmount(expense: Pick<Expense, 'amount'>): number {
  const amount = Number(expense.amount)
  return Number.isFinite(amount) ? amount : 0
}

function eventCountsAsMonthPaid(ev: Event): boolean {
  return impegnoPaidChargeInCurrentMonth(ev) != null
}

function eventUpcomingChargeInCurrentMonth(ev: Event): string | null {
  return impegnoUpcomingChargeInCurrentMonth(ev)
}

/** Spese già avvenute nel mese corrente (data ≤ oggi, importi positivi). */
export function computeMonthPaidTotal(
  expenses: Expense[],
  events: Event[] = [],
): number {
  const today = todayIso()
  const eventMap = eventMapById(events)
  let sum = 0
  const countedEventIds = new Set<number>()

  for (const expense of expenses) {
    const amount = expenseAmount(expense)
    if (amount <= 0) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    if (!isoInCurrentMonth(charge) || charge > today) continue
    sum += amount
    if (expense.eventId != null) countedEventIds.add(expense.eventId)
  }

  for (const ev of events) {
    if (!ev.id || countedEventIds.has(ev.id)) continue
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
  const eventMap = eventMapById(events)
  let count = 0
  const countedEventIds = new Set<number>()

  for (const expense of expenses) {
    const amount = expenseAmount(expense)
    if (amount <= 0) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    if (!isoInCurrentMonth(charge) || charge > today) continue
    count += 1
    if (expense.eventId != null) countedEventIds.add(expense.eventId)
  }

  for (const ev of events) {
    if (!ev.id || countedEventIds.has(ev.id)) continue
    if (eventCountsAsMonthPaid(ev)) count += 1
  }

  return count
}

/** Spese previste nel mese ma con data futura (non ancora avvenute). */
export function computeMonthUpcomingExpenses(
  expenses: Expense[],
  events: Event[] = [],
): UpcomingMonthExpense[] {
  const eventMap = eventMapById(events)
  const countedEventIds = new Set<number>()

  const fromExpenses = upcomingFromExpenses(expenses, events)
    .filter((u) => isoInCurrentMonth(u.date))
    .map((u) => {
      const linked = expenses.find(
        (e) =>
          expenseAmount(e) > 0 &&
          effectiveExpenseChargeDate(e, eventMap) === u.date &&
          e.amount === u.amount,
      )
      if (linked?.eventId != null) countedEventIds.add(linked.eventId)
      return u
    })

  const fromEvents: UpcomingMonthExpense[] = []
  for (const ev of events) {
    if (!ev.id || countedEventIds.has(ev.id)) continue
    const charge = eventUpcomingChargeInCurrentMonth(ev)
    if (!charge) continue
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
  events: Event[] = [],
): MonthExpenseOverviewItem[] {
  const eventMap = eventMapById(events)
  return expenses
    .filter(
      (e) =>
        e.amount > 0 &&
        (events.length > 0
          ? expenseInCurrentMonthWithEvents(e, events)
          : expenseInCurrentMonth(e)),
    )
    .sort(
      (a, b) =>
        effectiveExpenseChargeDate(a, eventMap).localeCompare(
          effectiveExpenseChargeDate(b, eventMap),
        ) ||
        a.description.localeCompare(b.description, 'it-IT'),
    )
    .map((expense) => {
      const charge = effectiveExpenseChargeDate(expense, eventMap)
      return {
        expense,
        occurred: expenseHasOccurred(expense, charge),
      }
    })
}

export function formatMonthExpenseOverviewLabel(
  expense: Expense,
  occurred: boolean,
  chargeDate = expense.date,
): string {
  const desc = sentenceCase(expense.description)
  const amount = formatAmount(expense.amount)
  if (occurred) return `${desc} · ${amount}`
  const days = daysUntil(chargeDate)
  const giorni = days === 1 ? 'giorno' : 'giorni'
  return `${desc} · ${amount} fra ${days} ${giorni}`
}

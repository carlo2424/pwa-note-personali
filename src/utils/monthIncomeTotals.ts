import type { Event, Expense } from '../db'
import { daysUntil, todayIso } from './countdown'
import {
  impegnoPaidChargesInCurrentMonth,
  impegnoUpcomingChargesInCurrentMonth,
} from './eventExpenses'
import { formatAmount, sentenceCase } from './format'
import {
  effectiveExpenseChargeDate,
  eventMapById,
  isoInCurrentMonth,
} from './monthFilter'
function incomeDedupeKey(eventId: number | undefined, date: string): string {
  return eventId != null ? `in:${eventId}:${date}` : ''
}

function receivedAmount(event: Pick<Event, 'received'>): number {
  const n = Number(event.received)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function expenseIncomeAmount(expense: Pick<Expense, 'amount'>): number {
  const n = Number(expense.amount)
  if (!Number.isFinite(n) || n >= 0) return 0
  return Math.abs(n)
}

/** Incassi già avvenuti nel mese corrente (da impegni + entrate manuali). */
export function computeMonthReceivedPaidTotal(
  expenses: Expense[],
  events: Event[] = [],
): number {
  const today = todayIso()
  const eventMap = eventMapById(events)
  let sum = 0
  const counted = new Set<string>()

  for (const expense of expenses) {
    const amount = expenseIncomeAmount(expense)
    if (amount <= 0) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    if (!isoInCurrentMonth(charge) || charge > today) continue
    sum += amount
    if (expense.eventId != null) {
      counted.add(incomeDedupeKey(expense.eventId, charge))
    }
  }

  for (const ev of events) {
    const amount = receivedAmount(ev)
    if (!ev.id || amount <= 0) continue
    for (const charge of impegnoPaidChargesInCurrentMonth(ev)) {
      const key = incomeDedupeKey(ev.id, charge)
      if (counted.has(key)) continue
      counted.add(key)
      sum += amount
    }
  }

  return sum
}

/** Incassi previsti nel mese corrente (data futura). */
export function computeMonthReceivedUpcomingTotal(
  expenses: Expense[],
  events: Event[] = [],
): number {
  return listMonthIncomingOverviewItems(expenses, events)
    .filter((item) => !item.occurred)
    .reduce((s, item) => s + item.amount, 0)
}

export interface MonthIncomingOverviewItem {
  label: string
  amount: number
  occurred: boolean
  chargeDate: string
  eventId?: number
}

/** Elenco incassi del mese per card riepilogo (incassati barrati). */
export function listMonthIncomingOverviewItems(
  expenses: Expense[],
  events: Event[] = [],
): MonthIncomingOverviewItem[] {
  const eventMap = eventMapById(events)
  const today = todayIso()
  const seen = new Set<string>()
  const items: MonthIncomingOverviewItem[] = []

  const tryAdd = (
    label: string,
    amount: number,
    chargeDate: string,
    eventId?: number,
  ) => {
    if (amount <= 0) return
    if (!isoInCurrentMonth(chargeDate)) return

    const key =
      eventId != null
        ? incomeDedupeKey(eventId, chargeDate)
        : `ex:${label}:${chargeDate}:${amount}`
    if (seen.has(key)) return
    seen.add(key)

    items.push({
      label: sentenceCase(label),
      amount,
      chargeDate,
      occurred: chargeDate <= today,
      eventId,
    })
  }

  for (const ev of events) {
    const amount = receivedAmount(ev)
    if (!ev.id || amount <= 0) continue
    const charges = [
      ...impegnoPaidChargesInCurrentMonth(ev),
      ...impegnoUpcomingChargesInCurrentMonth(ev),
    ]
    for (const charge of charges) {
      tryAdd(ev.title, amount, charge, ev.id)
    }
  }

  for (const expense of expenses) {
    if (expense.eventId != null) continue
    const amount = expenseIncomeAmount(expense)
    if (amount <= 0) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    tryAdd(expense.description, amount, charge)
  }

  return items.sort(
    (a, b) =>
      a.chargeDate.localeCompare(b.chargeDate) ||
      a.label.localeCompare(b.label, 'it-IT'),
  )
}

export function formatMonthIncomingOverviewLabel(
  item: MonthIncomingOverviewItem,
): string {
  const amount = formatAmount(item.amount)
  if (item.occurred) return `${item.label} · +${amount}`
  const days = daysUntil(item.chargeDate)
  if (days <= 0) return `${item.label} · +${amount}`
  const giorni = days === 1 ? 'giorno' : 'giorni'
  return `${item.label} · +${amount} tra ${days} ${giorni}`
}

/** Prossimo addebito/incasso testuale in dettaglio impegno. */
export function impegnoRenewalFieldLabel(
  event: Pick<Event, 'cost' | 'received'>,
): string {
  const hasCost = Number(event.cost) > 0
  const hasIn = receivedAmount(event) > 0
  if (hasCost && hasIn) return 'Prossimo addebito / incasso'
  if (hasIn) return 'Prossimo incasso'
  return 'Prossimo addebito'
}

import type { Event, Expense, PaymentMethod } from '../db'
import { daysUntil, todayIso } from './countdown'
import {
  impegnoPaidChargesInCurrentMonth,
  impegnoScadenzaDate,
  impegnoUpcomingChargesInCurrentMonth,
} from './eventExpenses'
import { formatAmount, sentenceCase } from './format'
import {
  effectiveExpenseChargeDate,
  eventMapById,
  isoInCurrentMonth,
} from './monthFilter'

export { impegnoPaidChargeInCurrentMonth } from './eventExpenses'

export interface UpcomingMonthExpense {
  amount: number
  date: string
  daysUntil: number
  eventId?: number
  expenseId?: number
}

function upcomingDedupeKey(item: UpcomingMonthExpense): string {
  if (item.eventId != null) return `ev:${item.eventId}:${item.date}`
  return `ex:${item.expenseId ?? item.amount}:${item.date}`
}

function dedupeUpcoming(items: UpcomingMonthExpense[]): UpcomingMonthExpense[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = upcomingDedupeKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
  return `−${formatAmount(amount)} tra ${daysUntil} ${giorni}`
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
  const raw = expenses
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
      eventId: expense.eventId,
      expenseId: expense.id,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return dedupeUpcoming(raw)
}

function expenseAmount(expense: Pick<Expense, 'amount'>): number {
  const amount = Number(expense.amount)
  return Number.isFinite(amount) ? amount : 0
}

export function eventChargeDedupeKey(
  eventId: number | undefined,
  date: string,
): string {
  return eventId != null ? `ev:${eventId}:${date}` : ''
}

/** Spese già avvenute nel mese corrente (data ≤ oggi, importi positivi). */
export function computeMonthPaidTotal(
  expenses: Expense[],
  events: Event[] = [],
): number {
  const today = todayIso()
  const eventMap = eventMapById(events)
  let sum = 0
  const countedEventCharges = new Set<string>()

  for (const expense of expenses) {
    const amount = expenseAmount(expense)
    if (amount <= 0) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    if (!isoInCurrentMonth(charge) || charge > today) continue
    sum += amount
    if (expense.eventId != null) {
      countedEventCharges.add(eventChargeDedupeKey(expense.eventId, charge))
    }
  }

  for (const ev of events) {
    if (!ev.id) continue
    const cost = Number(ev.cost) || 0
    if (cost <= 0) continue
    for (const charge of impegnoPaidChargesInCurrentMonth(ev)) {
      const key = eventChargeDedupeKey(ev.id, charge)
      if (countedEventCharges.has(key)) continue
      sum += cost
    }
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
  const countedEventCharges = new Set<string>()

  for (const expense of expenses) {
    const amount = expenseAmount(expense)
    if (amount <= 0) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    if (!isoInCurrentMonth(charge) || charge > today) continue
    count += 1
    if (expense.eventId != null) {
      countedEventCharges.add(eventChargeDedupeKey(expense.eventId, charge))
    }
  }

  for (const ev of events) {
    if (!ev.id) continue
    for (const charge of impegnoPaidChargesInCurrentMonth(ev)) {
      const key = eventChargeDedupeKey(ev.id, charge)
      if (countedEventCharges.has(key)) continue
      count += 1
    }
  }

  return count
}

/** Spese previste nel mese ma con data futura (non ancora avvenute). */
export function computeMonthUpcomingExpenses(
  expenses: Expense[],
  events: Event[] = [],
): UpcomingMonthExpense[] {
  const today = todayIso()
  const eventMap = eventMapById(events)
  const items: UpcomingMonthExpense[] = []

  for (const ev of events) {
    if (!ev.id) continue
    const amount = Number(ev.cost) || 0
    if (amount <= 0) continue
    for (const charge of impegnoUpcomingChargesInCurrentMonth(ev)) {
      if (!isoInCurrentMonth(charge)) continue
      items.push({
        amount,
        date: charge,
        daysUntil: daysUntil(charge),
        eventId: ev.id,
      })
    }
  }

  for (const expense of expenses) {
    if (expense.eventId != null) continue
    const amount = expenseAmount(expense)
    if (amount <= 0) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    if (charge <= today || !isoInCurrentMonth(charge)) continue
    items.push({
      amount,
      date: charge,
      daysUntil: daysUntil(charge),
      eventId: expense.eventId,
      expenseId: expense.id,
    })
  }

  return dedupeUpcoming(
    items.sort((a, b) => a.date.localeCompare(b.date)),
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

/** Righe anteprima spese previste in Home (deduplicate per impegno + data). */
export function listMonthUpcomingHomeLines(
  expenses: Expense[],
  events: Event[] = [],
): { label: string; date: string }[] {
  const eventMap = eventMapById(events)
  return computeMonthUpcomingExpenses(expenses, events).map((item) => {
    const linked = item.expenseId
      ? expenses.find((e) => e.id === item.expenseId)
      : expenses.find(
          (e) =>
            e.eventId === item.eventId &&
            effectiveExpenseChargeDate(e, eventMap) === item.date,
        )
    const ev =
      item.eventId != null ? eventMap.get(item.eventId) : undefined
    const label = sentenceCase(linked?.description ?? ev?.title ?? 'Spesa')
    return { label, date: item.date }
  })
}

export interface MonthExpenseOverviewItem {
  expense: Expense
  occurred: boolean
  chargeDate: string
}

function expenseStubFromEvent(ev: Event, chargeDate: string): Expense {
  return {
    amount: ev.cost ?? 0,
    description: ev.title,
    category: ev.labels[0] ?? 'Abbonamenti',
    date: chargeDate,
    paymentMethod: ev.paymentMethod,
    cardId: ev.cardId,
    eventId: ev.id,
    areaId: ev.areaId,
    createdAt: ev.updatedAt,
  }
}

/** Spese del mese per elenco riepilogo: data addebito effettiva, ordine cronologico. */
export function listMonthPositiveExpenses(
  expenses: Expense[],
  events: Event[] = [],
  filterMethod?: PaymentMethod | null,
): MonthExpenseOverviewItem[] {
  const eventMap = eventMapById(events)
  const today = todayIso()
  const seen = new Set<string>()
  const items: MonthExpenseOverviewItem[] = []

  const tryAdd = (
    expense: Expense,
    chargeDate: string,
    eventId?: number,
  ) => {
    if (expense.amount <= 0) return
    if (filterMethod && (expense.paymentMethod ?? 'altro') !== filterMethod) {
      return
    }
    if (!isoInCurrentMonth(chargeDate)) return

    const key =
      eventId != null
        ? eventChargeDedupeKey(eventId, chargeDate)
        : `ex:${expense.id ?? expense.description}:${chargeDate}`
    if (seen.has(key)) return
    seen.add(key)

    items.push({
      expense: { ...expense, date: chargeDate },
      chargeDate,
      occurred: chargeDate <= today,
    })
  }

  for (const ev of events) {
    if (!ev.id || !ev.cost || ev.cost <= 0) continue
    const linked = expenses.find((e) => e.eventId === ev.id && e.amount > 0)
    const base = linked ?? expenseStubFromEvent(ev, impegnoScadenzaDate(ev))
    const charges = [
      ...impegnoPaidChargesInCurrentMonth(ev),
      ...impegnoUpcomingChargesInCurrentMonth(ev),
    ]
    for (const charge of charges) {
      tryAdd(base, charge, ev.id)
    }
  }

  for (const expense of expenses) {
    if (expense.eventId != null) continue
    const charge = effectiveExpenseChargeDate(expense, eventMap)
    tryAdd(expense, charge)
  }

  return items.sort(
    (a, b) =>
      a.chargeDate.localeCompare(b.chargeDate) ||
      a.expense.description.localeCompare(b.expense.description, 'it-IT'),
  )
}

export function formatMonthExpenseOverviewLabel(
  expense: Expense,
  occurred: boolean,
  chargeDate: string,
): string {
  const desc = sentenceCase(expense.description)
  const amount = formatAmount(expense.amount)
  if (occurred) return `${desc} · ${amount}`
  const days = daysUntil(chargeDate)
  if (days <= 0) return `${desc} · ${amount}`
  const giorni = days === 1 ? 'giorno' : 'giorni'
  return `${desc} · ${amount} tra ${days} ${giorni}`
}

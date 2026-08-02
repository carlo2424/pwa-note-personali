import type { Event, Expense, PaymentCard, PaymentMethod } from '../db'
import { PAYMENT_METHODS } from '../constants/events'
import { todayIso } from './countdown'
import { impegnoPaidChargesInCurrentMonth } from './eventExpenses'
import {
  effectiveExpenseChargeDate,
  eventMapById,
  isoInCurrentMonth,
} from './monthFilter'
import { eventChargeDedupeKey } from './monthExpenseTotals'
import { formatAmount } from './format'

function resolvePaymentMethod(value?: string): PaymentMethod {
  if (
    value === 'carta' ||
    value === 'bonifico' ||
    value === 'contanti' ||
    value === 'altro'
  ) {
    return value
  }
  return 'altro'
}

function expenseAmount(expense: Pick<Expense, 'amount'>): number {
  const amount = Number(expense.amount)
  return Number.isFinite(amount) ? amount : 0
}

function paidExpenseInMonth(
  e: Expense,
  eventsById: Map<number, Event>,
): string | null {
  const charge = effectiveExpenseChargeDate(e, eventsById)
  if (!isoInCurrentMonth(charge) || charge > todayIso()) return null
  return charge
}

export interface MethodTotal {
  method: PaymentMethod
  label: string
  total: number
}

export interface CardBreakdown {
  card: PaymentCard
  spese: number
  eventi: number
  total: number
}

export function sumByPaymentMethod(
  expenses: Expense[],
  events: Event[],
  monthOnly: boolean,
): MethodTotal[] {
  const totals: Record<PaymentMethod, number> = {
    carta: 0,
    bonifico: 0,
    contanti: 0,
    altro: 0,
  }

  const eventsById = eventMapById(events)
  const countedEventCharges = new Set<string>()
  const linkedEventIds = new Set<number>()

  for (const e of expenses) {
    const amount = expenseAmount(e)
    if (amount <= 0) continue

    if (monthOnly) {
      const charge = paidExpenseInMonth(e, eventsById)
      if (!charge) continue
      const method = resolvePaymentMethod(e.paymentMethod)
      totals[method] += amount
      if (e.eventId != null) {
        countedEventCharges.add(eventChargeDedupeKey(e.eventId, charge))
      }
    } else {
      const method = resolvePaymentMethod(e.paymentMethod)
      totals[method] += amount
      if (e.eventId != null) linkedEventIds.add(e.eventId)
    }
  }

  if (monthOnly) {
    for (const ev of events) {
      const cost = Number(ev.cost)
      if (!ev.id || !Number.isFinite(cost) || cost <= 0) continue
      for (const charge of impegnoPaidChargesInCurrentMonth(ev)) {
        const key = eventChargeDedupeKey(ev.id, charge)
        if (countedEventCharges.has(key)) continue
        countedEventCharges.add(key)
        const method = resolvePaymentMethod(ev.paymentMethod ?? 'carta')
        totals[method] += cost
      }
    }
  } else {
    for (const ev of events) {
      const cost = Number(ev.cost)
      if (!Number.isFinite(cost) || cost <= 0) continue
      if (ev.id != null && linkedEventIds.has(ev.id)) continue
      const method = resolvePaymentMethod(ev.paymentMethod ?? 'carta')
      totals[method] += cost
    }
  }

  return PAYMENT_METHODS.map((m) => ({
    method: m.value,
    label: m.label,
    total: totals[m.value],
  }))
}

export function cardBreakdowns(
  cards: PaymentCard[],
  expenses: Expense[],
  events: Event[],
  monthOnly: boolean,
): CardBreakdown[] {
  const eventsById = eventMapById(events)
  const countedEventCharges = new Set<string>()

  return cards.map((card) => {
    if (!card.id) {
      return { card, spese: 0, eventi: 0, total: 0 }
    }

    let spese = 0
    for (const e of expenses) {
      if (e.cardId !== card.id) continue
      const amount = expenseAmount(e)
      if (amount <= 0) continue
      if (monthOnly) {
        const charge = paidExpenseInMonth(e, eventsById)
        if (!charge) continue
        spese += amount
        if (e.eventId != null) {
          countedEventCharges.add(eventChargeDedupeKey(e.eventId, charge))
        }
      } else {
        spese += amount
      }
    }

    let eventi = 0
    if (monthOnly) {
      for (const ev of events) {
        if (ev.cardId !== card.id) continue
        const cost = Number(ev.cost)
        if (!ev.id || !Number.isFinite(cost) || cost <= 0) continue
        for (const charge of impegnoPaidChargesInCurrentMonth(ev)) {
          const key = eventChargeDedupeKey(ev.id, charge)
          if (countedEventCharges.has(key)) continue
          countedEventCharges.add(key)
          eventi += cost
        }
      }
    } else {
      const linkedEventIds = new Set<number>()
      for (const e of expenses) {
        if (e.cardId === card.id && e.eventId != null && expenseAmount(e) > 0) {
          linkedEventIds.add(e.eventId)
        }
      }
      eventi = events
        .filter(
          (e) =>
            e.cardId === card.id &&
            e.cost != null &&
            Number(e.cost) > 0 &&
            (e.id == null || !linkedEventIds.has(e.id)),
        )
        .reduce((s, e) => s + (Number(e.cost) || 0), 0)
    }

    return { card, spese, eventi, total: spese + eventi }
  })
}

export function grandTotal(methods: MethodTotal[]): number {
  return methods.reduce((s, m) => s + m.total, 0)
}

export function formatMethodTotal(total: number): string {
  return formatAmount(total)
}

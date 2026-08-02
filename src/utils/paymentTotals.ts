import type { Event, Expense, PaymentCard, PaymentMethod } from '../db'
import { PAYMENT_METHODS } from '../constants/events'
import { todayIso } from './countdown'
import {
  effectiveExpenseChargeDate,
  eventMapById,
  isoInCurrentMonth,
} from './monthFilter'
import { impegnoPaidChargeInCurrentMonth } from './monthExpenseTotals'
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

function expenseCountsInMonth(e: Expense, eventsById: Map<number, Event>): boolean {
  const charge = effectiveExpenseChargeDate(e, eventsById)
  return isoInCurrentMonth(charge) && charge <= todayIso()
}

function eventCountsInMonth(ev: Event): boolean {
  return impegnoPaidChargeInCurrentMonth(ev) != null
}

function expenseAmount(expense: Pick<Expense, 'amount'>): number {
  const amount = Number(expense.amount)
  return Number.isFinite(amount) ? amount : 0
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
  const linkedEventIds = new Set<number>()

  for (const e of expenses) {
    const amount = expenseAmount(e)
    if (amount <= 0) continue
    if (monthOnly && !expenseCountsInMonth(e, eventsById)) continue
    const method = resolvePaymentMethod(e.paymentMethod)
    totals[method] += amount
    if (monthOnly && e.eventId != null) linkedEventIds.add(e.eventId)
  }

  for (const ev of events) {
    const cost = Number(ev.cost)
    if (!Number.isFinite(cost) || cost <= 0) continue
    if (ev.id != null && linkedEventIds.has(ev.id)) continue
    if (monthOnly && !eventCountsInMonth(ev)) continue
    const method = resolvePaymentMethod(ev.paymentMethod ?? 'carta')
    totals[method] += cost
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
  return cards.map((card) => {
    if (!card.id) {
      return { card, spese: 0, eventi: 0, total: 0 }
    }
    const spese = expenses
      .filter(
        (e) =>
          e.cardId === card.id &&
          expenseAmount(e) > 0 &&
          (!monthOnly || expenseCountsInMonth(e, eventsById)),
      )
      .reduce((s, e) => s + expenseAmount(e), 0)
    const eventi = events
      .filter(
        (e) =>
          e.cardId === card.id &&
          e.cost != null &&
          Number(e.cost) > 0 &&
          (!monthOnly || eventCountsInMonth(e)),
      )
      .reduce((s, e) => s + (Number(e.cost) || 0), 0)
    return { card, spese, eventi, total: spese + eventi }
  })
}

export function grandTotal(methods: MethodTotal[]): number {
  return methods.reduce((s, m) => s + m.total, 0)
}

export function formatMethodTotal(total: number): string {
  return formatAmount(total)
}

import type { Event, Expense, PaymentCard, PaymentMethod } from '../db'
import { PAYMENT_METHODS } from '../constants/events'
import {
  eventInCurrentMonth,
  expenseInCurrentMonth,
} from './monthFilter'
import { formatAmount } from './format'

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

  for (const e of expenses) {
    if (e.amount <= 0) continue
    if (monthOnly && !expenseInCurrentMonth(e)) continue
    const method = (e.paymentMethod ?? 'altro') as PaymentMethod
    totals[method] += e.amount
  }

  for (const ev of events) {
    if (!ev.cost || ev.cost <= 0) continue
    if (monthOnly && !eventInCurrentMonth(ev)) continue
    const method = ev.paymentMethod ?? 'carta'
    totals[method] += ev.cost
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
  return cards.map((card) => {
    if (!card.id) {
      return { card, spese: 0, eventi: 0, total: 0 }
    }
    const spese = expenses
      .filter(
        (e) =>
          e.cardId === card.id &&
          e.amount > 0 &&
          (!monthOnly || expenseInCurrentMonth(e)),
      )
      .reduce((s, e) => s + e.amount, 0)
    const eventi = events
      .filter(
        (e) =>
          e.cardId === card.id &&
          e.cost != null &&
          e.cost > 0 &&
          (!monthOnly || eventInCurrentMonth(e)),
      )
      .reduce((s, e) => s + (e.cost ?? 0), 0)
    return { card, spese, eventi, total: spese + eventi }
  })
}

export function grandTotal(methods: MethodTotal[]): number {
  return methods.reduce((s, m) => s + m.total, 0)
}

export function formatMethodTotal(total: number): string {
  return formatAmount(total)
}

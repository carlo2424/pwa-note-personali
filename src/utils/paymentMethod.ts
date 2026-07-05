import type { Event, Expense, PaymentMethod } from '../db'

/** Carta e bonifico: addebito gestito dalla banca, senza conferma manuale. */
export function isAutomatedPaymentMethod(
  method?: PaymentMethod | string,
): boolean {
  return method === 'carta' || method === 'bonifico'
}

export function eventRequiresManualDone(
  event: Pick<Event, 'paymentMethod'>,
): boolean {
  return !isAutomatedPaymentMethod(event.paymentMethod)
}

export function expenseRequiresManualDone(
  expense: Pick<Expense, 'paymentMethod'>,
): boolean {
  return !isAutomatedPaymentMethod(expense.paymentMethod)
}

import type { PaymentAccountKind, PaymentCard } from '../db'

export function paymentAccountKind(
  account: Pick<PaymentCard, 'kind'>,
): PaymentAccountKind {
  return account.kind ?? 'carta'
}

export function filterPaymentAccounts(
  accounts: PaymentCard[],
  kind: PaymentAccountKind,
): PaymentCard[] {
  return accounts.filter((a) => paymentAccountKind(a) === kind)
}

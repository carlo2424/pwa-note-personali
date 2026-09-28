import type { Event } from '../db'

export function eventHasPayableCost(
  event: Pick<Event, 'cost'>,
): boolean {
  const cost = Number(event.cost)
  return Number.isFinite(cost) && cost > 0
}

export function eventHasReceivable(
  event: Pick<Event, 'received'>,
): boolean {
  const received = Number(event.received)
  return Number.isFinite(received) && received > 0
}

export function eventMoneyFlow(
  event: Pick<Event, 'cost' | 'received'>,
): 'pay' | 'receive' | 'both' | 'none' {
  const pay = eventHasPayableCost(event)
  const receive = eventHasReceivable(event)
  if (pay && receive) return 'both'
  if (pay) return 'pay'
  if (receive) return 'receive'
  return 'none'
}

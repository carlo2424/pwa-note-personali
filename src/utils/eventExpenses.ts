import { db, type Event } from '../db'

/** Data effettiva di addebito impegno (rinnovo se presente, altrimenti inizio). */
export function eventChargeDate(
  event: Pick<Event, 'renewalDate' | 'startDate'>,
): string {
  return event.renewalDate ?? event.startDate
}

/** Sincronizza le spese collegate a un evento (costo / ricevuto) */
export async function syncExpensesForEvent(
  eventId: number,
  event: Omit<Event, 'id'>,
): Promise<void> {
  const linked = await db.expenses.where('eventId').equals(eventId).toArray()
  for (const e of linked) {
    if (e.id) await db.expenses.delete(e.id)
  }

  const now = Date.now()
  const category = event.labels[0] || 'Abbonamenti'
  const chargeDate = eventChargeDate(event)

  if (event.cost != null && event.cost > 0) {
    await db.expenses.add({
      amount: event.cost,
      description: event.title,
      category,
      date: chargeDate,
      paymentMethod: event.paymentMethod,
      cardId: event.cardId,
      eventId,
      areaId: event.areaId,
      createdAt: now,
    })
  }

  if (event.received != null && event.received > 0) {
    await db.expenses.add({
      amount: -event.received,
      description: `${event.title} (ricevuto)`,
      category: 'Entrate',
      date: chargeDate,
      paymentMethod: event.paymentMethod,
      cardId: event.cardId,
      eventId,
      areaId: event.areaId,
      createdAt: now,
    })
  }
}

/** Rimuove le spese generate da un evento */
export async function deleteExpensesForEvent(eventId: number): Promise<void> {
  const linked = await db.expenses.where('eventId').equals(eventId).toArray()
  for (const e of linked) {
    if (e.id) await db.expenses.delete(e.id)
  }
}

/** Allinea le date delle spese collegate al rinnovo/data addebito corrente. */
export async function repairEventExpenseChargeDates(): Promise<void> {
  const events = await db.events.toArray()
  for (const event of events) {
    if (!event.id) continue
    if (!event.cost && !event.received) continue
    await syncExpensesForEvent(event.id, event)
  }
}

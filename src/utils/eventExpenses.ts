import { db, type Event } from '../db'

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

  if (event.cost != null && event.cost > 0) {
    await db.expenses.add({
      amount: event.cost,
      description: event.title,
      category,
      date: event.startDate,
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
      date: event.startDate,
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

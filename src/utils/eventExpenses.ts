import { db, type Event } from '../db'
import { todayIso } from './countdown'
import { lastRecurrenceDueOnOrBeforeToday } from './impegnoDates'

/** Data effettiva di addebito: rinnovo, oppure fine periodo (impegni singoli), altrimenti inizio. */
export function eventChargeDate(
  event: Pick<Event, 'renewalDate' | 'startDate' | 'endDate' | 'recurrenceFrequency'>,
): string {
  if (event.renewalDate) return event.renewalDate
  if (event.recurrenceFrequency) return event.startDate
  if (event.endDate) return event.endDate
  return event.startDate
}

/** Periodo appena convalidato con la spunta (rinnovo/scadenza passata). */
export function closedPeriodChargeDate(
  event: Pick<
    Event,
    'renewalDate' | 'startDate' | 'endDate' | 'recurrenceFrequency'
  >,
): string {
  if (event.recurrenceFrequency && event.startDate) {
    if (event.renewalDate && event.renewalDate <= todayIso()) {
      return event.renewalDate
    }
    const lastDue = lastRecurrenceDueOnOrBeforeToday(
      event.startDate,
      event.recurrenceFrequency,
    )
    if (lastDue) return lastDue
  }
  return event.endDate ?? event.startDate ?? todayIso()
}

/** Registra la spesa del periodo convalidato senza cancellare lo storico. */
export async function ensurePeriodExpenseForEvent(
  eventId: number,
  event: Omit<Event, 'id'>,
  chargeDate: string,
): Promise<void> {
  const linked = await db.expenses.where('eventId').equals(eventId).toArray()
  const now = Date.now()
  const category = event.labels[0] || 'Abbonamenti'

  if (event.cost != null && event.cost > 0) {
    const exists = linked.some(
      (e) => e.amount > 0 && e.amount === event.cost && e.date === chargeDate,
    )
    if (!exists) {
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
  }

  if (event.received != null && event.received > 0) {
    const negAmount = -event.received
    const exists = linked.some(
      (e) => e.amount === negAmount && e.date === chargeDate,
    )
    if (!exists) {
      await db.expenses.add({
        amount: negAmount,
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
}

/** Sincronizza la proiezione spesa futura; conserva le voci già pagate. */
export async function syncExpensesForEvent(
  eventId: number,
  event: Omit<Event, 'id'>,
): Promise<void> {
  const linked = await db.expenses.where('eventId').equals(eventId).toArray()
  const chargeDate = eventChargeDate(event)
  const now = Date.now()
  const category = event.labels[0] || 'Abbonamenti'

  for (const e of linked) {
    if (!e.id) continue
    const isCostRow =
      event.cost != null &&
      event.cost > 0 &&
      e.amount > 0 &&
      e.amount === event.cost
    const isReceivedRow =
      event.received != null &&
      event.received > 0 &&
      e.amount < 0 &&
      Math.abs(e.amount) === event.received
    if ((isCostRow || isReceivedRow) && e.date >= chargeDate) {
      await db.expenses.delete(e.id)
    }
  }

  const freshLinked = await db.expenses.where('eventId').equals(eventId).toArray()
  const hasCost = freshLinked.some(
    (e) => e.amount > 0 && e.date === chargeDate && e.amount === (event.cost ?? 0),
  )
  const hasReceived = freshLinked.some(
    (e) =>
      e.amount < 0 &&
      e.date === chargeDate &&
      event.received != null &&
      Math.abs(e.amount) === event.received,
  )

  if (event.cost != null && event.cost > 0 && !hasCost) {
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

  if (event.received != null && event.received > 0 && !hasReceived) {
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

/** Allinea spese collegate e recupera periodi pagati mancanti. */
export async function repairEventExpenseChargeDates(): Promise<void> {
  const events = await db.events.toArray()
  for (const event of events) {
    if (!event.id) continue
    if (!event.cost && !event.received) continue
    const closed = closedPeriodChargeDate(event)
    if (closed <= todayIso()) {
      await ensurePeriodExpenseForEvent(event.id, event, closed)
    }
    await syncExpensesForEvent(event.id, event)
  }
}

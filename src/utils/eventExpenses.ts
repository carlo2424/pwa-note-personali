import { db, type Event } from '../db'
import { todayIso } from './countdown'
import {
  addRecurrence,
  computeEndDateFromFrequency,
  lastRecurrenceDueOnOrBeforeTodayCapped,
  parseIsoDate,
  toIsoDateLocal,
} from './impegnoDates'

function isoInCurrentMonth(iso: string): boolean {
  const now = new Date()
  const startMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const endMs = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime()
  const t = new Date(iso + 'T00:00:00').getTime()
  return t >= startMs && t <= endMs
}

function monthBoundsIso(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toIsoDateLocal(start), end: toIsoDateLocal(end) }
}

/** Fine definitiva impegno (ultimo pagamento possibile). Per ricorrenti: data fine oltre il 1° periodo. */
export function impegnoDefinitiveEndDate(
  event: Pick<Event, 'startDate' | 'endDate' | 'recurrenceFrequency'>,
): string | undefined {
  if (!event.endDate || !event.startDate) return undefined
  if (!event.recurrenceFrequency) return event.endDate
  const periodEnd = computeEndDateFromFrequency(
    event.startDate,
    event.recurrenceFrequency,
  )
  if (event.endDate > periodEnd) return event.endDate
  return undefined
}

/** Impegno ancora attivo: fine definitiva non superata (o assente = senza termine). */
export function isImpegnoCommitmentActive(
  event: Pick<Event, 'startDate' | 'endDate' | 'recurrenceFrequency'>,
): boolean {
  const definitive = impegnoDefinitiveEndDate(event)
  if (!definitive) return true
  return todayIso() <= definitive
}

/** Prossimo addebito di periodo (rinnovo), non la fine definitiva dell'impegno. */
export function impegnoScadenzaDate(
  event: Pick<Event, 'renewalDate' | 'startDate' | 'endDate' | 'recurrenceFrequency'>,
): string {
  if (event.recurrenceFrequency) {
    return event.renewalDate ?? event.startDate
  }
  if (event.startDate && event.endDate && event.endDate >= event.startDate) {
    return event.endDate
  }
  return event.endDate ?? event.startDate
}

/** Alias semantico: data di addebito del periodo corrente. */
export function eventChargeDate(
  event: Pick<Event, 'renewalDate' | 'startDate' | 'endDate' | 'recurrenceFrequency'>,
): string {
  return impegnoScadenzaDate(event)
}

export function isImpegnoScadenzaPassed(
  event: Pick<Event, 'renewalDate' | 'startDate' | 'endDate' | 'recurrenceFrequency'>,
): boolean {
  const scadenza = impegnoScadenzaDate(event)
  return !!scadenza && scadenza <= todayIso()
}

function recurrenceChargeInMonth(
  ev: Event,
  test: (iso: string) => boolean,
): string | null {
  if (!ev.recurrenceFrequency || !ev.startDate) return null

  const definitive = impegnoDefinitiveEndDate(ev)
  const { start: monthStart, end: monthEnd } = monthBoundsIso()

  if (definitive && definitive < monthStart) return null

  const renewal = ev.renewalDate
  if (renewal && renewal >= monthStart && renewal <= monthEnd && test(renewal)) {
    if (!definitive || renewal <= definitive) return renewal
  }

  let current = parseIsoDate(ev.startDate)
  for (let i = 0; i < 600; i++) {
    const iso = toIsoDateLocal(current)
    if (definitive && iso > definitive) break
    if (iso > monthEnd) break
    if (iso >= monthStart && iso <= monthEnd && test(iso)) {
      if (!definitive || iso <= definitive) return iso
    }
    const next = addRecurrence(current, ev.recurrenceFrequency)
    if (toIsoDateLocal(next) === iso) break
    current = next
  }
  return null
}

/** Addebito impegno già avvenuto nel mese corrente, entro la fine definitiva. */
export function impegnoPaidChargeInCurrentMonth(ev: Event): string | null {
  const cost = Number(ev.cost)
  if (!Number.isFinite(cost) || cost <= 0) return null

  const today = todayIso()
  const definitive = impegnoDefinitiveEndDate(ev)
  const { start: monthStart } = monthBoundsIso()

  if (definitive && definitive < monthStart) return null

  if (!ev.recurrenceFrequency) {
    const scadenza = impegnoScadenzaDate(ev)
    if (isoInCurrentMonth(scadenza) && scadenza <= today) {
      if (!definitive || scadenza <= definitive) return scadenza
    }
    return null
  }

  return recurrenceChargeInMonth(ev, (iso) => iso <= today)
}

/** Prossimo addebito nel mese corrente (fine definitiva ancora in vigore). */
export function impegnoUpcomingChargeInCurrentMonth(ev: Event): string | null {
  const cost = Number(ev.cost)
  if (!Number.isFinite(cost) || cost <= 0) return null
  if (!isImpegnoCommitmentActive(ev)) return null

  const today = todayIso()
  return recurrenceChargeInMonth(ev, (iso) => iso > today)
}

/** Periodo appena convalidato con la spunta (rinnovo/scadenza passata). */
export function closedPeriodChargeDate(
  event: Pick<
    Event,
    'renewalDate' | 'startDate' | 'endDate' | 'recurrenceFrequency'
  >,
): string {
  const definitive = impegnoDefinitiveEndDate(event)

  if (event.recurrenceFrequency && event.startDate) {
    if (event.renewalDate && event.renewalDate <= todayIso()) {
      if (!definitive || event.renewalDate <= definitive) {
        return event.renewalDate
      }
    }
    const lastDue = lastRecurrenceDueOnOrBeforeTodayCapped(
      event.startDate,
      event.recurrenceFrequency,
      definitive,
    )
    if (lastDue) return lastDue
  }
  return impegnoScadenzaDate(event)
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
  if (!isImpegnoCommitmentActive(event)) {
    return
  }

  const linked = await db.expenses.where('eventId').equals(eventId).toArray()
  let chargeDate = eventChargeDate(event)
  const definitive = impegnoDefinitiveEndDate(event)
  if (definitive && chargeDate > definitive) {
    chargeDate = definitive
  }
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

  if (event.cost != null && event.cost > 0 && !hasCost && chargeDate >= todayIso()) {
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

  if (
    event.received != null &&
    event.received > 0 &&
    !hasReceived &&
    chargeDate >= todayIso()
  ) {
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

/** Elimina righe spesa duplicate collegate allo stesso impegno e data. */
export async function pruneDuplicateLinkedExpenses(eventId: number): Promise<void> {
  const linked = await db.expenses.where('eventId').equals(eventId).toArray()
  const keepKeys = new Map<string, number>()
  for (const expense of linked.sort((a, b) => a.createdAt - b.createdAt)) {
    const key = `${expense.date}:${expense.amount}`
    if (keepKeys.has(key)) {
      if (expense.id) await db.expenses.delete(expense.id)
    } else if (expense.id) {
      keepKeys.set(key, expense.id)
    }
  }
}

/** Allinea spese collegate e recupera periodi pagati mancanti. */
export async function repairEventExpenseChargeDates(): Promise<void> {
  const events = await db.events.toArray()
  for (const event of events) {
    if (!event.id) continue
    if (!event.cost && !event.received) continue
    await pruneDuplicateLinkedExpenses(event.id)
    const closed = closedPeriodChargeDate(event)
    if (closed <= todayIso()) {
      await ensurePeriodExpenseForEvent(event.id, event, closed)
    }
    await syncExpensesForEvent(event.id, event)
  }
}

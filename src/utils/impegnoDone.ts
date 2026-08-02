import { db, type Event, type Note, type RecurrenceFrequency } from '../db'
import { isPastDue, todayIso } from './countdown'
import { addRecurrence, parseIsoDate, toIsoDateLocal, repairCorruptedRenewalPatch, computeNextRenewalDate } from './impegnoDates'
import { isAutomatedPaymentMethod, eventRequiresManualDone } from './paymentMethod'
import { isOverdueEvent } from './overdue'
import { syncExpensesForEvent, ensurePeriodExpenseForEvent, closedPeriodChargeDate, isImpegnoScadenzaPassed, impegnoDefinitiveEndDate } from './eventExpenses'

export { eventRequiresManualDone }

/** Il periodo corrente è convalidabile (scadenza ≤ oggi), non prima. */
export function isImpegnoPeriodReadyForDone(
  event: Pick<
    Event,
    | 'startDate'
    | 'endDate'
    | 'renewalDate'
    | 'recurrenceFrequency'
    | 'paymentMethod'
    | 'completedAt'
  >,
): boolean {
  if (isAutomatedPaymentMethod(event.paymentMethod)) return false
  if (isImpegnoScadenzaPassed(event)) return true
  if (event.recurrenceFrequency && isOverdueEvent(event)) return true
  return false
}

/** @deprecated Usare isImpegnoPeriodReadyForDone */
export const isRecurringPeriodReadyForDone = isImpegnoPeriodReadyForDone

export function isEventMarkedDone(
  event: Pick<
    Event,
    | 'completedAt'
    | 'renewalDate'
    | 'recurrenceFrequency'
    | 'paymentMethod'
    | 'startDate'
    | 'endDate'
  >,
): boolean {
  if (event.completedAt == null) return false
  if (!isImpegnoPeriodReadyForDone(event)) return false
  return true
}

export function isNoteImpegnoMarkedDone(
  note: Pick<Note, 'completedAt'>,
  linkedTasks: { done: boolean }[] = [],
): boolean {
  if (note.completedAt != null) return true
  if (linkedTasks.length === 0) return false
  return linkedTasks.every((t) => t.done)
}

/** Impegno ancora da completare (escluso dalla card Home chiusa). */
export function isEventImpegnoPending(
  event: Pick<
    Event,
    | 'completedAt'
    | 'renewalDate'
    | 'recurrenceFrequency'
    | 'paymentMethod'
    | 'startDate'
  >,
): boolean {
  return !isEventMarkedDone(event)
}

export function isNoteImpegnoPending(
  note: Pick<Note, 'completedAt'>,
  linkedTasks: { done: boolean }[] = [],
): boolean {
  return !isNoteImpegnoMarkedDone(note, linkedTasks)
}

/** Prossima data rinnovo dopo aver segnato fatto (>= oggi), senza superare la fine definitiva. */
export function advanceRenewalAfterDone(
  renewalDate: string,
  frequency: RecurrenceFrequency,
  definitiveEnd?: string,
): string {
  const today = toIsoDateLocal(new Date())
  let current = parseIsoDate(renewalDate)
  do {
    current = addRecurrence(current, frequency)
  } while (toIsoDateLocal(current) < today)
  const next = toIsoDateLocal(current)
  if (definitiveEnd && next > definitiveEnd) return definitiveEnd
  return next
}

export async function markEventDone(event: Event): Promise<void> {
  if (!event.id) return
  const now = Date.now()

  if (
    event.recurrenceFrequency &&
    !isAutomatedPaymentMethod(event.paymentMethod) &&
    !isImpegnoPeriodReadyForDone(event)
  ) {
    return
  }

  if ((event.cost || event.received) && isImpegnoScadenzaPassed(event)) {
    await ensurePeriodExpenseForEvent(
      event.id,
      event,
      closedPeriodChargeDate(event),
    )
  }

  if (
    event.recurrenceFrequency &&
    !isAutomatedPaymentMethod(event.paymentMethod) &&
    event.renewalDate &&
    event.renewalDate <= todayIso()
  ) {
    const definitive = impegnoDefinitiveEndDate(event)
    const renewalDate = advanceRenewalAfterDone(
      event.renewalDate,
      event.recurrenceFrequency,
      definitive,
    )
    await db.events.update(event.id, {
      renewalDate,
      completedAt: undefined,
      updatedAt: now,
    })
    const updated = await db.events.get(event.id)
    if (updated?.cost || updated?.received) {
      await syncExpensesForEvent(event.id, updated)
    }
    return
  }

  if (
    event.recurrenceFrequency &&
    event.startDate &&
    !isAutomatedPaymentMethod(event.paymentMethod) &&
    (isOverdueEvent(event) ||
      (event.renewalDate != null && isPastDue(event.renewalDate)))
  ) {
    const renewalDate = computeNextRenewalDate(
      event.startDate,
      event.recurrenceFrequency,
    )
    await db.events.update(event.id, {
      renewalDate,
      completedAt: undefined,
      updatedAt: now,
    })
    const updated = await db.events.get(event.id)
    if (updated?.cost || updated?.received) {
      await syncExpensesForEvent(event.id, updated)
    }
    return
  }

  await db.events.update(event.id, {
    completedAt: now,
    updatedAt: now,
  })
  const updated = await db.events.get(event.id)
  if (updated && (updated.cost || updated.received)) {
    await syncExpensesForEvent(event.id, updated)
  }
}

export async function unmarkEventDone(event: Event): Promise<void> {
  if (!event.id) return
  await db.events.update(event.id, {
    completedAt: undefined,
    updatedAt: Date.now(),
  })
}

export async function toggleEventDone(event: Event): Promise<void> {
  if (!event.id) return
  const fresh = (await db.events.get(event.id)) ?? event

  if (
    fresh.completedAt &&
    fresh.recurrenceFrequency &&
    !isImpegnoPeriodReadyForDone(fresh)
  ) {
    await unmarkEventDone(fresh)
    return
  }

  if (isEventMarkedDone(fresh)) {
    await unmarkEventDone(fresh)
  } else {
    await markEventDone(fresh)
  }
}

export async function markNoteImpegnoDone(note: Note): Promise<void> {
  if (!note.id) return
  const now = Date.now()
  await db.notes.update(note.id, {
    completedAt: now,
    updatedAt: now,
  })

  const tasks = await db.tasks.where('noteId').equals(note.id).toArray()
  for (const task of tasks) {
    if (task.id && !task.done) {
      await db.tasks.update(task.id, { done: true, completedAt: now })
    }
  }
}

export async function unmarkNoteImpegnoDone(note: Note): Promise<void> {
  if (!note.id) return
  await db.notes.update(note.id, {
    completedAt: undefined,
    updatedAt: Date.now(),
  })
}

export async function toggleNoteImpegnoDone(
  note: Note,
  linkedTasks: { done: boolean }[] = [],
): Promise<void> {
  if (isNoteImpegnoMarkedDone(note, linkedTasks)) {
    await unmarkNoteImpegnoDone(note)
  } else {
    await markNoteImpegnoDone(note)
  }
}

export async function repairCorruptedRenewalDates(): Promise<void> {
  const events = await db.events.toArray()
  const now = Date.now()

  for (const event of events) {
    if (!event.id) continue
    const patch = repairCorruptedRenewalPatch(event)
    if (!patch) continue
    await db.events.update(event.id, { ...patch, updatedAt: now })
  }
}

/** Avanza il rinnovo quando la scadenza è passata; per carta/bonifico segna anche i singoli impegni. */
export async function syncAutomatedEventRenewal(event: Event): Promise<void> {
  if (!event.id) return

  const now = Date.now()

  if (
    event.recurrenceFrequency &&
    event.renewalDate &&
    isPastDue(event.renewalDate)
  ) {
    if (isAutomatedPaymentMethod(event.paymentMethod)) {
      const definitive = impegnoDefinitiveEndDate(event)
      const renewalDate = advanceRenewalAfterDone(
        event.renewalDate,
        event.recurrenceFrequency,
        definitive,
      )
      if (renewalDate !== event.renewalDate) {
        if (event.cost || event.received) {
          await ensurePeriodExpenseForEvent(
            event.id,
            event,
            closedPeriodChargeDate(event),
          )
        }
        await db.events.update(event.id, {
          renewalDate,
          completedAt: undefined,
          updatedAt: now,
        })
        const updated = await db.events.get(event.id)
        if (updated?.cost || updated?.received) {
          await syncExpensesForEvent(event.id, updated)
        }
      }
      return
    }

    if (event.completedAt) {
      const definitive = impegnoDefinitiveEndDate(event)
      const renewalDate = advanceRenewalAfterDone(
        event.renewalDate,
        event.recurrenceFrequency,
        definitive,
      )
      if (renewalDate !== event.renewalDate) {
        if (event.cost || event.received) {
          await ensurePeriodExpenseForEvent(
            event.id,
            event,
            closedPeriodChargeDate(event),
          )
        }
        await db.events.update(event.id, {
          renewalDate,
          completedAt: undefined,
          updatedAt: now,
        })
        const updated = await db.events.get(event.id)
        if (updated?.cost || updated?.received) {
          await syncExpensesForEvent(event.id, updated)
        }
      }
    }
    return
  }

  if (
    event.recurrenceFrequency &&
    event.renewalDate &&
    event.renewalDate > todayIso() &&
    event.completedAt &&
    !isAutomatedPaymentMethod(event.paymentMethod)
  ) {
    await db.events.update(event.id, {
      completedAt: undefined,
      updatedAt: now,
    })
    return
  }

  if (
    !isAutomatedPaymentMethod(event.paymentMethod) ||
    event.recurrenceFrequency
  ) {
    return
  }

  if (
    !event.completedAt &&
    isPastDue(event.renewalDate ?? event.endDate)
  ) {
    if (event.cost || event.received) {
      await ensurePeriodExpenseForEvent(
        event.id,
        event,
        closedPeriodChargeDate(event),
      )
    }
    await db.events.update(event.id, {
      completedAt: now,
      updatedAt: now,
    })
  }
}

export async function syncAllAutomatedEventRenewals(): Promise<void> {
  await repairCorruptedRenewalDates()
  const events = await db.events.toArray()
  for (const event of events) {
    if (!event.startDate || !event.endDate) continue
    await syncAutomatedEventRenewal(event)
  }
}

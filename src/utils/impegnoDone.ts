import { db, type Event, type Note, type RecurrenceFrequency } from '../db'
import { isPastDue, todayIso } from './countdown'
import { addRecurrence, parseIsoDate, toIsoDateLocal, repairCorruptedRenewalPatch, computeNextRenewalDate } from './impegnoDates'
import { isAutomatedPaymentMethod, eventRequiresManualDone } from './paymentMethod'
import { isOverdueEvent } from './overdue'

export { eventRequiresManualDone }

/** Il periodo corrente è convalidabile (scaduto o rinnovo passato), non futuro. */
export function isRecurringPeriodReadyForDone(
  event: Pick<
    Event,
    | 'startDate'
    | 'renewalDate'
    | 'recurrenceFrequency'
    | 'paymentMethod'
    | 'completedAt'
  >,
): boolean {
  if (isAutomatedPaymentMethod(event.paymentMethod)) return false
  if (!event.recurrenceFrequency) return true
  if (isOverdueEvent(event)) return true
  // Convalidabile anche il giorno della scadenza (oggi), non solo se passata.
  if (event.renewalDate && event.renewalDate <= todayIso()) return true
  return false
}

export function isEventMarkedDone(
  event: Pick<
    Event,
    'completedAt' | 'renewalDate' | 'recurrenceFrequency' | 'paymentMethod' | 'startDate'
  >,
): boolean {
  if (event.completedAt == null) return false
  if (
    event.recurrenceFrequency &&
    !isRecurringPeriodReadyForDone(event)
  ) {
    return false
  }
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

/** Prossima data rinnovo dopo aver segnato fatto (>= oggi). */
export function advanceRenewalAfterDone(
  renewalDate: string,
  frequency: RecurrenceFrequency,
): string {
  const today = toIsoDateLocal(new Date())
  let current = parseIsoDate(renewalDate)
  do {
    current = addRecurrence(current, frequency)
  } while (toIsoDateLocal(current) < today)
  return toIsoDateLocal(current)
}

export async function markEventDone(event: Event): Promise<void> {
  if (!event.id) return
  const now = Date.now()

  if (
    event.recurrenceFrequency &&
    !isAutomatedPaymentMethod(event.paymentMethod) &&
    !isRecurringPeriodReadyForDone(event)
  ) {
    return
  }

  if (
    event.recurrenceFrequency &&
    !isAutomatedPaymentMethod(event.paymentMethod) &&
    event.renewalDate &&
    event.renewalDate <= todayIso()
  ) {
    const renewalDate = advanceRenewalAfterDone(
      event.renewalDate,
      event.recurrenceFrequency,
    )
    await db.events.update(event.id, {
      renewalDate,
      completedAt: undefined,
      updatedAt: now,
    })
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
    return
  }

  await db.events.update(event.id, {
    completedAt: now,
    updatedAt: now,
  })
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
    !isRecurringPeriodReadyForDone(fresh)
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
      const renewalDate = advanceRenewalAfterDone(
        event.renewalDate,
        event.recurrenceFrequency,
      )
      if (renewalDate !== event.renewalDate) {
        await db.events.update(event.id, {
          renewalDate,
          completedAt: undefined,
          updatedAt: now,
        })
      }
      return
    }

    if (event.completedAt) {
      const renewalDate = advanceRenewalAfterDone(
        event.renewalDate,
        event.recurrenceFrequency,
      )
      if (renewalDate !== event.renewalDate) {
        await db.events.update(event.id, {
          renewalDate,
          completedAt: undefined,
          updatedAt: now,
        })
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

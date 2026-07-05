import { db, type Event, type Note, type RecurrenceFrequency } from '../db'
import { addRecurrence, parseIsoDate, toIsoDateLocal } from './impegnoDates'

export function isEventMarkedDone(
  event: Pick<Event, 'completedAt'>,
): boolean {
  return event.completedAt != null
}

export function isNoteImpegnoMarkedDone(
  note: Pick<Note, 'completedAt'>,
  linkedTasks: { done: boolean }[] = [],
): boolean {
  if (note.completedAt != null) return true
  if (linkedTasks.length === 0) return false
  return linkedTasks.every((t) => t.done)
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

  if (event.recurrenceFrequency && event.renewalDate) {
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

  await db.events.update(event.id, {
    completedAt: now,
    updatedAt: now,
  })
}

export async function unmarkEventDone(event: Event): Promise<void> {
  if (!event.id || event.recurrenceFrequency) return
  await db.events.update(event.id, {
    completedAt: undefined,
    updatedAt: Date.now(),
  })
}

export async function toggleEventDone(event: Event): Promise<void> {
  if (isEventMarkedDone(event)) {
    await unmarkEventDone(event)
  } else {
    await markEventDone(event)
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

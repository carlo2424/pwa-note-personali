import { db, type Event, type Note, type Task } from '../db'
import { isPastDue } from './countdown'
import { lastRecurrenceDueOnOrBeforeToday } from './impegnoDates'
import { isNoteImpegno } from './impegno'
import { isNoteChecklist } from './noteKind'
import { isAutomatedPaymentMethod } from './paymentMethod'

export function tasksForNote(tasks: Task[], noteId?: number): Task[] {
  if (!noteId) return []
  return tasks.filter((t) => t.noteId === noteId)
}

/** Nota-impegno scaduta e non completata (lista o periodo ancora aperto) */
export function isOverdueNoteImpegno(
  note: Pick<Note, 'id' | 'startDate' | 'endDate' | 'content' | 'completedAt'>,
  linkedTasks: Pick<Task, 'done'>[],
): boolean {
  if (note.completedAt) return false
  if (!isNoteImpegno(note) || !isPastDue(note.endDate)) return false

  const hasChecklist = isNoteChecklist(note) && linkedTasks.length > 0

  if (hasChecklist && linkedTasks.length > 0) {
    return linkedTasks.some((t) => !t.done)
  }

  return true
}

function isRecurringManualOverdue(
  event: Pick<Event, 'startDate' | 'renewalDate' | 'recurrenceFrequency'>,
): boolean {
  if (!event.startDate || !event.recurrenceFrequency) return false

  if (event.renewalDate && isPastDue(event.renewalDate)) return true

  const lastDue = lastRecurrenceDueOnOrBeforeToday(
    event.startDate,
    event.recurrenceFrequency,
  )
  if (!lastDue || !isPastDue(lastDue)) return false

  // Rinnovo spostato in avanti (sync o modifica) ma periodo precedente non convalidato
  if (event.renewalDate && event.renewalDate > lastDue) return true

  return !event.renewalDate
}

/** Impegno evento con fine o rinnovo passato */
export function isOverdueEvent(
  event: Pick<
    Event,
    | 'startDate'
    | 'endDate'
    | 'renewalDate'
    | 'completedAt'
    | 'paymentMethod'
    | 'recurrenceFrequency'
  >,
): boolean {
  if (isAutomatedPaymentMethod(event.paymentMethod)) return false
  if (event.completedAt) return false

  if (event.recurrenceFrequency && event.startDate) {
    return isRecurringManualOverdue(event)
  }

  if (event.endDate && isPastDue(event.endDate)) return true
  if (event.renewalDate && isPastDue(event.renewalDate)) return true
  return false
}

export type OverdueCounts = {
  impegni: number
}

export async function computeOverdueCounts(): Promise<OverdueCounts> {
  const [events, notes, tasks] = await Promise.all([
    db.events.toArray(),
    db.notes.toArray(),
    db.tasks.toArray(),
  ])

  let impegni = 0

  for (const note of notes) {
    if (!isNoteImpegno(note)) continue
    const linked = tasksForNote(tasks, note.id)
    if (isOverdueNoteImpegno(note, linked)) impegni++
  }

  for (const event of events) {
    if (!event.startDate || !event.endDate) continue
    if (isOverdueEvent(event)) impegni++
  }

  return { impegni }
}

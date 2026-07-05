import { db, type Event, type Note, type Task } from '../db'
import { isPastDue } from './countdown'
import { isNoteImpegno } from './impegno'
import { isNoteChecklist } from './noteKind'

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

/** Impegno evento con fine o rinnovo passato */
export function isOverdueEvent(
  event: Pick<Event, 'startDate' | 'endDate' | 'renewalDate' | 'completedAt'>,
): boolean {
  if (event.completedAt) return false
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

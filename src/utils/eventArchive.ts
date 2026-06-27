import { db, type Event } from '../db'
import { addToArchive, serializeEvent } from './archive'
import { deleteExpensesForEvent } from './eventExpenses'
import { deleteTasksForEvent } from './eventTasks'

export async function archiveEvent(event: Event, onDone?: () => void) {
  if (!event.id) return
  try {
    const linkedTasks = await db.tasks
      .where('eventId')
      .equals(event.id)
      .toArray()
    await addToArchive({
      originalId: event.id,
      type: 'event',
      title: event.title,
      data: serializeEvent(event, linkedTasks),
      photoBlob: event.photoBlob,
      voiceBlob: event.voiceBlob,
      archivedAt: Date.now(),
    })
    await deleteExpensesForEvent(event.id)
    await deleteTasksForEvent(event.id)
    await db.events.delete(event.id)
    onDone?.()
  } catch {
    // errore già mostrato in addToArchive
  }
}

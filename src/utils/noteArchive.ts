import { db, type Note } from '../db'
import { addToArchive } from './archive'
import { deleteTasksForNote } from './noteTasks'

export async function archiveNote(note: Note): Promise<void> {
  if (!note.id) return
  await addToArchive({
    originalId: note.id,
    type: 'note',
    title: note.title,
    data: JSON.stringify(note),
    photoBlob: note.photoBlob,
    archivedAt: Date.now(),
  })
  await deleteTasksForNote(note.id)
  await db.notes.delete(note.id)
}

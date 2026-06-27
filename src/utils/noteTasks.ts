import { db } from '../db'
import { sentenceCase } from './format'
import { parseTaskLines } from './eventTasks'

/** Una riga = una voce; servono almeno 2 righe per attivare la lista con spunte */
export const MIN_CHECKLIST_LINES = 2

export function isNoteChecklistContent(content: string): boolean {
  return parseTaskLines(content).length >= MIN_CHECKLIST_LINES
}

export async function deleteTasksForNote(noteId: number): Promise<void> {
  const linked = await db.tasks.where('noteId').equals(noteId).toArray()
  for (const t of linked) {
    if (t.id) await db.tasks.delete(t.id)
  }
}

/** Sincronizza le voci checklist collegate a una nota (dal contenuto multiriga) */
export async function syncChecklistForNote(
  noteId: number,
  content: string,
): Promise<void> {
  const lines = parseTaskLines(content)
  if (lines.length < MIN_CHECKLIST_LINES) {
    await deleteTasksForNote(noteId)
    return
  }

  const existing = await db.tasks
    .where('noteId')
    .equals(noteId)
    .sortBy('createdAt')
  const now = Date.now()

  for (let i = 0; i < lines.length; i++) {
    const title = sentenceCase(lines[i])
    const prev = existing[i]
    if (prev?.id) {
      await db.tasks.update(prev.id, { title, noteId })
    } else {
      await db.tasks.add({
        title,
        done: false,
        noteId,
        createdAt: now,
      })
    }
  }

  for (let i = lines.length; i < existing.length; i++) {
    if (existing[i].id) await db.tasks.delete(existing[i].id)
  }
}

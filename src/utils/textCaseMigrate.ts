import { db } from '../db'
import { sentenceCase } from './format'

/** Aggiorna titoli/testi esistenti al formato prima lettera maiuscola */
export async function migrateTextToSentenceCase(): Promise<void> {
  const notes = await db.notes.toArray()
  for (const n of notes) {
    if (!n.id) continue
    const title = sentenceCase(n.title)
    const content = n.content ? sentenceCase(n.content) : n.content
    if (title !== n.title || content !== n.content) {
      await db.notes.update(n.id, { title, content })
    }
  }

  const events = await db.events.toArray()
  for (const e of events) {
    if (!e.id) continue
    const title = sentenceCase(e.title)
    const writtenNote = e.writtenNote ? sentenceCase(e.writtenNote) : e.writtenNote
    if (title !== e.title || writtenNote !== e.writtenNote) {
      await db.events.update(e.id, { title, writtenNote })
    }
  }

  const expenses = await db.expenses.toArray()
  for (const e of expenses) {
    if (!e.id) continue
    const description = sentenceCase(e.description)
    if (description !== e.description) {
      await db.expenses.update(e.id, { description })
    }
  }

  const tasks = await db.tasks.toArray()
  for (const t of tasks) {
    if (!t.id) continue
    const title = sentenceCase(t.title)
    if (title !== t.title) {
      await db.tasks.update(t.id, { title })
    }
  }

  const lists = await db.taskLists.toArray()
  for (const l of lists) {
    if (!l.id) continue
    const title = sentenceCase(l.title)
    if (title !== l.title) {
      await db.taskLists.update(l.id, { title })
    }
  }

  const areas = await db.areas.toArray()
  for (const a of areas) {
    if (!a.id) continue
    const name = sentenceCase(a.name)
    if (name !== a.name) {
      await db.areas.update(a.id, { name })
    }
  }
}

import { db } from '../db'
import { sentenceCase } from './format'

export type TodoInput = {
  id?: number
  title: string
  done: boolean
}

export function parseTaskLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function addStandaloneTask(
  title: string,
  dueDate?: string,
): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) return
  await db.tasks.add({
    title: sentenceCase(trimmed),
    done: false,
    dueDate: dueDate || undefined,
    createdAt: Date.now(),
  })
}

export async function addTaskList(
  title: string,
  itemTitles: string[],
  dueDate?: string,
): Promise<number> {
  const listId = await db.taskLists.add({
    title: sentenceCase(title.trim()) || 'Lista',
    dueDate: dueDate || undefined,
    createdAt: Date.now(),
  })
  const now = Date.now()
  await db.tasks.bulkAdd(
    itemTitles.map((itemTitle) => ({
      title: sentenceCase(itemTitle),
      listId,
      done: false,
      createdAt: now,
    })),
  )
  if (listId === undefined) throw new Error('Impossibile creare la lista')
  return listId
}

/** Una riga = attività singola; due o più righe = una lista raggruppata */
export async function addStandaloneTasks(
  text: string,
  dueDate?: string,
  listTitle?: string,
): Promise<number> {
  const items = parseTaskLines(text)
  if (items.length === 0) return 0
  if (items.length === 1) {
    await addStandaloneTask(items[0], dueDate)
    return 1
  }
  await addTaskList(listTitle?.trim() || 'Lista', items, dueDate)
  return items.length
}

export async function toggleTask(id: number, done: boolean): Promise<void> {
  await db.tasks.update(id, {
    done: !done,
    completedAt: !done ? Date.now() : undefined,
  })
}

/** Elimina una lista e tutte le voci collegate */
export async function deleteTaskList(listId: number): Promise<void> {
  const linked = await db.tasks.where('listId').equals(listId).toArray()
  for (const t of linked) {
    if (t.id) await db.tasks.delete(t.id)
  }
  await db.taskLists.delete(listId)
}

/** Elimina un'attività singola (non collegata a evento) */
export async function deleteStandaloneTask(taskId: number): Promise<void> {
  await db.tasks.delete(taskId)
}

/** Aggiorna titolo e scadenza di un'attività singola */
export async function updateStandaloneTask(
  taskId: number,
  title: string,
  dueDate?: string,
): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) return
  await db.tasks.update(taskId, {
    title: sentenceCase(trimmed),
    dueDate: dueDate || undefined,
  })
}

/** Aggiorna lista: metadati + voci ancora da fare (quelle completate restano) */
export async function updateTaskList(
  listId: number,
  title: string,
  dueDate: string | undefined,
  pendingLines: string[],
): Promise<void> {
  await db.taskLists.update(listId, {
    title: sentenceCase(title.trim()) || 'Lista',
    dueDate: dueDate || undefined,
  })

  const existing = await db.tasks.where('listId').equals(listId).toArray()
  for (const t of existing.filter((item) => !item.done)) {
    if (t.id) await db.tasks.delete(t.id)
  }

  const now = Date.now()
  const items = pendingLines.map((line) => line.trim()).filter(Boolean)
  if (items.length > 0) {
    await db.tasks.bulkAdd(
      items.map((itemTitle) => ({
        title: sentenceCase(itemTitle),
        done: false,
        listId,
        createdAt: now,
      })),
    )
  }
}

/** Sincronizza le attività collegate a un evento */
export async function syncTasksForEvent(
  eventId: number,
  todos: TodoInput[],
): Promise<void> {
  const valid = todos.filter((t) => t.title.trim())
  const existing = await db.tasks.where('eventId').equals(eventId).toArray()
  const incomingIds = new Set(valid.filter((t) => t.id).map((t) => t.id!))

  for (const t of existing) {
    if (t.id && !incomingIds.has(t.id)) {
      await db.tasks.delete(t.id)
    }
  }

  const now = Date.now()
  for (const todo of valid) {
    const title = sentenceCase(todo.title.trim())
    if (todo.id) {
      const prev = existing.find((e) => e.id === todo.id)
      await db.tasks.update(todo.id, {
        title,
        done: todo.done,
        eventId,
        completedAt: todo.done
          ? (prev?.completedAt ?? now)
          : undefined,
      })
    } else {
      await db.tasks.add({
        title,
        done: todo.done,
        eventId,
        createdAt: now,
        completedAt: todo.done ? now : undefined,
      })
    }
  }
}

export async function deleteTasksForEvent(eventId: number): Promise<void> {
  const linked = await db.tasks.where('eventId').equals(eventId).toArray()
  for (const t of linked) {
    if (t.id) await db.tasks.delete(t.id)
  }
}

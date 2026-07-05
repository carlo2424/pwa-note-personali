import { db, type ArchiveItem, type Event, type Task } from '../db'

export type ArchivedTask = Pick<
  Task,
  'title' | 'done' | 'createdAt' | 'completedAt' | 'dueDate'
>

export type SerializedEventData = Omit<Event, 'id' | 'photoBlob' | 'voiceBlob'> & {
  linkedTasks?: ArchivedTask[]
}

/** Serializza un evento per l'archivio (senza Blob nel JSON) */
export function serializeEvent(event: Event, linkedTasks: Task[] = []): string {
  const data: SerializedEventData = {
    title: event.title,
    writtenNote: event.writtenNote ?? '',
    labels: event.labels ?? [],
    startDate: event.startDate,
    endDate: event.endDate,
    durationDays: event.durationDays,
    recurrenceFrequency: event.recurrenceFrequency,
    renewalDate: event.renewalDate,
    completedAt: event.completedAt,
    color: event.color,
    icon: event.icon,
    cost: event.cost,
    received: event.received,
    paymentMethod: event.paymentMethod,
    cardId: event.cardId,
    areaId: event.areaId,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    linkedTasks: linkedTasks.map(({ title, done, createdAt, completedAt, dueDate }) => ({
      title,
      done,
      createdAt,
      completedAt,
      dueDate,
    })),
  }
  return JSON.stringify(data)
}

export async function addToArchive(item: Omit<ArchiveItem, 'id'>): Promise<void> {
  try {
    await db.archive.add(item)
  } catch (err) {
    console.error('[Archivio] Errore salvataggio:', err)
    alert('Impossibile archiviare. Riprova.')
    throw err
  }
}

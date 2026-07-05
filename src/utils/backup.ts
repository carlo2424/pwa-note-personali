import { db } from '../db'
import { updateDataFingerprint } from './dataFingerprint'
import type {
  ArchiveItem,
  Area,
  Event,
  Expense,
  Note,
  PaymentCard,
  Task,
  TaskList,
} from '../db'

export const BACKUP_FILE_VERSION = 1
export const BACKUP_MIME = 'application/json'

type SerializedBlob = { _blob: true; type: string; base64: string }

type SerializedNote = Omit<Note, 'photoBlob'> & {
  photoBlob?: SerializedBlob
}

type SerializedEvent = Omit<Event, 'voiceBlob' | 'photoBlob'> & {
  voiceBlob?: SerializedBlob
  photoBlob?: SerializedBlob
}

type SerializedArchiveItem = Omit<ArchiveItem, 'photoBlob' | 'voiceBlob'> & {
  photoBlob?: SerializedBlob
  voiceBlob?: SerializedBlob
}

export type BackupPayload = {
  version: number
  exportedAt: string
  app: 'note-personali'
  data: {
    notes: SerializedNote[]
    expenses: Expense[]
    archive: SerializedArchiveItem[]
    events: SerializedEvent[]
    tasks: Task[]
    taskLists: TaskList[]
    paymentCards: PaymentCard[]
    areas: Area[]
  }
}

async function blobToSerialized(blob: Blob): Promise<SerializedBlob> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return {
    _blob: true,
    type: blob.type || 'application/octet-stream',
    base64: btoa(binary),
  }
}

function serializedToBlob(value: SerializedBlob): Blob {
  const binary = atob(value.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: value.type })
}

function isSerializedBlob(value: unknown): value is SerializedBlob {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as SerializedBlob)._blob === true &&
    typeof (value as SerializedBlob).base64 === 'string'
  )
}

async function serializeOptionalBlob(
  blob?: Blob,
): Promise<Blob | SerializedBlob | undefined> {
  if (!blob) return undefined
  return blobToSerialized(blob)
}

function deserializeOptionalBlob(
  value: Blob | SerializedBlob | undefined,
): Blob | undefined {
  if (!value) return undefined
  if (value instanceof Blob) return value
  if (isSerializedBlob(value)) return serializedToBlob(value)
  return undefined
}

async function serializeNote(note: Note): Promise<SerializedNote> {
  return {
    ...note,
    photoBlob: (await serializeOptionalBlob(note.photoBlob)) as
      | SerializedBlob
      | undefined,
  }
}

async function serializeEvent(event: Event): Promise<SerializedEvent> {
  return {
    ...event,
    voiceBlob: (await serializeOptionalBlob(event.voiceBlob)) as
      | SerializedBlob
      | undefined,
    photoBlob: (await serializeOptionalBlob(event.photoBlob)) as
      | SerializedBlob
      | undefined,
  }
}

async function serializeArchiveItem(
  item: ArchiveItem,
): Promise<SerializedArchiveItem> {
  return {
    ...item,
    photoBlob: (await serializeOptionalBlob(item.photoBlob)) as
      | SerializedBlob
      | undefined,
    voiceBlob: (await serializeOptionalBlob(item.voiceBlob)) as
      | SerializedBlob
      | undefined,
  }
}

function deserializeNote(note: SerializedNote): Note {
  return { ...note, photoBlob: deserializeOptionalBlob(note.photoBlob) }
}

function deserializeEvent(event: SerializedEvent): Event {
  return {
    ...event,
    voiceBlob: deserializeOptionalBlob(event.voiceBlob),
    photoBlob: deserializeOptionalBlob(event.photoBlob),
  }
}

function deserializeArchiveItem(item: SerializedArchiveItem): ArchiveItem {
  return {
    ...item,
    photoBlob: deserializeOptionalBlob(item.photoBlob),
    voiceBlob: deserializeOptionalBlob(item.voiceBlob),
  }
}

export async function exportBackup(): Promise<BackupPayload> {
  const [notes, expenses, archive, events, tasks, taskLists, paymentCards, areas] =
    await Promise.all([
      db.notes.toArray(),
      db.expenses.toArray(),
      db.archive.toArray(),
      db.events.toArray(),
      db.tasks.toArray(),
      db.taskLists.toArray(),
      db.paymentCards.toArray(),
      db.areas.toArray(),
    ])

  return {
    version: BACKUP_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'note-personali',
    data: {
      notes: await Promise.all(notes.map(serializeNote)),
      expenses,
      archive: await Promise.all(archive.map(serializeArchiveItem)),
      events: await Promise.all(events.map(serializeEvent)),
      tasks,
      taskLists,
      paymentCards,
      areas,
    },
  }
}

export function backupFileName(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10)
  return `note-personali-backup-${iso}.json`
}

export async function downloadBackup(): Promise<void> {
  const payload = await exportBackup()
  const json = JSON.stringify(payload)
  const blob = new Blob([json], { type: BACKUP_MIME })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName()
  link.click()
  URL.revokeObjectURL(url)
}

function parseBackupJson(text: string): BackupPayload {
  const parsed = JSON.parse(text) as BackupPayload
  if (parsed?.app !== 'note-personali' || !parsed.data) {
    throw new Error('File di backup non valido.')
  }
  if (parsed.version !== BACKUP_FILE_VERSION) {
    throw new Error(
      `Versione backup non supportata (${String(parsed.version)}). Aggiorna l'app.`,
    )
  }
  return parsed
}

export async function restoreBackup(payload: BackupPayload): Promise<void> {
  const data = payload.data

  await db.transaction(
    'rw',
    [
      db.notes,
      db.expenses,
      db.archive,
      db.events,
      db.tasks,
      db.taskLists,
      db.paymentCards,
      db.areas,
    ],
    async () => {
      await Promise.all([
        db.notes.clear(),
        db.expenses.clear(),
        db.archive.clear(),
        db.events.clear(),
        db.tasks.clear(),
        db.taskLists.clear(),
        db.paymentCards.clear(),
        db.areas.clear(),
      ])

      if (data.areas.length > 0) {
        await db.areas.bulkPut(data.areas)
      }
      if (data.paymentCards.length > 0) {
        await db.paymentCards.bulkPut(data.paymentCards)
      }
      if (data.notes.length > 0) {
        await db.notes.bulkPut(data.notes.map(deserializeNote))
      }
      if (data.events.length > 0) {
        await db.events.bulkPut(data.events.map(deserializeEvent))
      }
      if (data.expenses.length > 0) {
        await db.expenses.bulkPut(data.expenses)
      }
      if (data.taskLists.length > 0) {
        await db.taskLists.bulkPut(data.taskLists)
      }
      if (data.tasks.length > 0) {
        await db.tasks.bulkPut(data.tasks)
      }
      if (data.archive.length > 0) {
        await db.archive.bulkPut(data.archive.map(deserializeArchiveItem))
      }
    },
  )
  await updateDataFingerprint()
}

export async function importBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text()
  const payload = parseBackupJson(text)
  await restoreBackup(payload)
  return payload
}

export function summarizeBackup(payload: BackupPayload): string {
  const { data } = payload
  const parts = [
    `${data.notes.length} note`,
    `${data.events.length} impegni`,
    `${data.expenses.length} spese`,
    `${data.tasks.length} attività`,
    `${data.areas.length} aree`,
  ]
  return parts.join(' · ')
}

/** True se c'è almeno un elemento da salvare */
export async function hasBackupableData(): Promise<boolean> {
  const counts = await Promise.all([
    db.notes.count(),
    db.events.count(),
    db.expenses.count(),
    db.tasks.count(),
    db.taskLists.count(),
    db.paymentCards.count(),
    db.areas.count(),
    db.archive.count(),
  ])
  return counts.some((c) => c > 0)
}

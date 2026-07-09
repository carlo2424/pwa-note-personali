import { db } from '../db'
import { updateDataFingerprint } from './dataFingerprint'
import {
  getLinkedBackupFileName,
  readRollingLocalBackupText,
  writeLinkedBackupFile,
  writeRollingLocalBackup,
} from './backupStorage'
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
export const BACKUP_FIXED_FILENAME = 'note-personali-backup.json'

export type BackupSaveResult = {
  payload: BackupPayload
  localCopyReplaced: boolean
  linkedFileReplaced: boolean
  downloaded: boolean
  linkedFileName: string | null
}

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

async function serializeNote(
  note: Note,
  includeBlobs = true,
): Promise<SerializedNote> {
  return {
    ...note,
    photoBlob: includeBlobs
      ? ((await serializeOptionalBlob(note.photoBlob)) as
          | SerializedBlob
          | undefined)
      : undefined,
  }
}

async function serializeEvent(
  event: Event,
  includeBlobs = true,
): Promise<SerializedEvent> {
  return {
    ...event,
    voiceBlob: includeBlobs
      ? ((await serializeOptionalBlob(event.voiceBlob)) as
          | SerializedBlob
          | undefined)
      : undefined,
    photoBlob: includeBlobs
      ? ((await serializeOptionalBlob(event.photoBlob)) as
          | SerializedBlob
          | undefined)
      : undefined,
  }
}

async function serializeArchiveItem(
  item: ArchiveItem,
  includeBlobs = true,
): Promise<SerializedArchiveItem> {
  return {
    ...item,
    photoBlob: includeBlobs
      ? ((await serializeOptionalBlob(item.photoBlob)) as
          | SerializedBlob
          | undefined)
      : undefined,
    voiceBlob: includeBlobs
      ? ((await serializeOptionalBlob(item.voiceBlob)) as
          | SerializedBlob
          | undefined)
      : undefined,
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

export async function exportBackup(options?: {
  /** Includi foto/audio (default true). Con false lo snapshot resta leggero. */
  includeBlobs?: boolean
}): Promise<BackupPayload> {
  const includeBlobs = options?.includeBlobs !== false
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
      notes: await Promise.all(notes.map((n) => serializeNote(n, includeBlobs))),
      expenses,
      archive: await Promise.all(
        archive.map((a) => serializeArchiveItem(a, includeBlobs)),
      ),
      events: await Promise.all(
        events.map((e) => serializeEvent(e, includeBlobs)),
      ),
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

function triggerDownload(json: string, fileName: string): void {
  const blob = new Blob([json], { type: BACKUP_MIME })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function saveBackup(options?: {
  /** Sostituisce copia locale e file collegato; scarica sempre un solo nome fisso */
  replacePrevious?: boolean
  /** Scarica anche un file sul dispositivo (Download / Condividi) */
  download?: boolean
}): Promise<BackupSaveResult> {
  const replacePrevious = options?.replacePrevious !== false
  const download = options?.download !== false
  const payload = await exportBackup()
  const json = JSON.stringify(payload)
  const linkedFileName = await getLinkedBackupFileName()

  let localCopyReplaced = false
  let linkedFileReplaced = false
  let downloaded = false

  if (replacePrevious) {
    localCopyReplaced = await writeRollingLocalBackup(json)
    const linked = await writeLinkedBackupFile(json)
    linkedFileReplaced = linked === 'written'
  }

  if (download) {
    triggerDownload(
      json,
      replacePrevious ? BACKUP_FIXED_FILENAME : backupFileName(),
    )
    downloaded = true
  }

  return {
    payload,
    localCopyReplaced,
    linkedFileReplaced,
    downloaded,
    linkedFileName,
  }
}

export async function downloadBackup(options?: {
  replacePrevious?: boolean
}): Promise<BackupSaveResult> {
  return saveBackup(options)
}

export async function restoreRollingLocalBackup(): Promise<BackupPayload> {
  const text = await readRollingLocalBackupText()
  if (!text) {
    throw new Error('Nessuna copia locale di backup trovata.')
  }
  const payload = parseBackupJson(text)
  await restoreBackup(payload)
  return payload
}

export { hasRollingLocalBackup, getLinkedBackupFileName } from './backupStorage'
export {
  linkBackupExportFile,
  unlinkBackupExportFile,
  supportsBackupFilePicker,
} from './backupStorage'

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

/** Valida un JSON di backup senza applicarlo. */
export function parseBackupPayload(text: string): BackupPayload {
  return parseBackupJson(text)
}

/** Ripristina i dati a partire da un JSON di backup (es. cloud). */
export async function restoreBackupFromText(
  text: string,
): Promise<BackupPayload> {
  const payload = parseBackupJson(text)
  await restoreBackup(payload)
  return payload
}

/** Numero totale di elementi contenuti in un payload di backup. */
export function countBackupPayload(payload: BackupPayload): number {
  return backupPayloadTotal(payload)
}

/** Costruisce il JSON di backup completo (con foto/audio). */
export async function buildBackupJson(): Promise<string> {
  return JSON.stringify(await exportBackup({ includeBlobs: true }))
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

/* ---------------------------------------------------------------------------
 * Snapshot automatico ridondante (protezione perdita dati)
 *
 * A ogni modifica salviamo una copia:
 *  - in localStorage (leggera, senza foto/audio) — area separata da IndexedDB
 *  - in OPFS (completa) — quando supportato
 * All'avvio, se il database risulta vuoto ma esiste uno snapshot, ripristiniamo
 * automaticamente prima di mostrare l'app.
 * ------------------------------------------------------------------------- */

const AUTO_SNAPSHOT_KEY = 'pwa-auto-backup-v1'
/** Limite prudente per localStorage (~5 MB totali per origine). */
const AUTO_SNAPSHOT_MAX_BYTES = 4_500_000

export interface AutoSnapshotMeta {
  savedAt: number
  notes: number
  events: number
  expenses: number
}

function byteLength(text: string): number {
  try {
    return new Blob([text]).size
  } catch {
    return text.length
  }
}

function backupPayloadTotal(payload: BackupPayload): number {
  const d = payload.data
  return (
    d.notes.length +
    d.events.length +
    d.expenses.length +
    d.tasks.length +
    d.taskLists.length +
    d.paymentCards.length +
    d.areas.length +
    d.archive.length
  )
}

function tryParseBackupJson(text: string | null): BackupPayload | null {
  if (!text) return null
  try {
    return parseBackupJson(text)
  } catch {
    return null
  }
}

/**
 * Salva uno snapshot automatico (best-effort) in localStorage e OPFS.
 * Non lancia mai: la protezione non deve interrompere l'uso dell'app.
 */
export async function saveAutoSnapshot(): Promise<void> {
  try {
    if (!(await hasBackupableData())) return

    // Copia completa (con foto/audio) su OPFS quando disponibile.
    try {
      const full = await exportBackup({ includeBlobs: true })
      await writeRollingLocalBackup(JSON.stringify(full))
    } catch {
      // OPFS non disponibile o negato: ignora
    }

    // Copia leggera (senza blob) in localStorage: area più resistente.
    try {
      const slim = await exportBackup({ includeBlobs: false })
      const json = JSON.stringify(slim)
      if (byteLength(json) <= AUTO_SNAPSHOT_MAX_BYTES) {
        localStorage.setItem(AUTO_SNAPSHOT_KEY, json)
      }
    } catch {
      // quota localStorage superata: resta la copia OPFS
    }
  } catch {
    // best-effort
  }
}

let autoSnapshotTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Pianifica un salvataggio snapshot dopo un breve ritardo, unendo modifiche
 * ravvicinate (da chiamare dopo ogni creazione/modifica/eliminazione).
 */
export function scheduleAutoSnapshot(delayMs = 1500): void {
  if (typeof window === 'undefined') {
    void saveAutoSnapshot()
    return
  }
  if (autoSnapshotTimer) clearTimeout(autoSnapshotTimer)
  autoSnapshotTimer = setTimeout(() => {
    autoSnapshotTimer = undefined
    void saveAutoSnapshot()
  }, delayMs)
}

/** Metadati dello snapshot automatico disponibile (localStorage o OPFS). */
export async function readAutoSnapshotMeta(): Promise<AutoSnapshotMeta | null> {
  const local = tryParseBackupJson(localStorage.getItem(AUTO_SNAPSHOT_KEY))
  const opfs = local
    ? null
    : tryParseBackupJson(await readRollingLocalBackupText())
  const payload = local ?? opfs
  if (!payload || backupPayloadTotal(payload) === 0) return null
  return {
    savedAt: Date.parse(payload.exportedAt) || 0,
    notes: payload.data.notes.length,
    events: payload.data.events.length,
    expenses: payload.data.expenses.length,
  }
}

/**
 * Se il database è vuoto ma esiste uno snapshot con dati, ripristina
 * automaticamente. Restituisce il payload ripristinato oppure null.
 */
export async function tryAutoRestore(): Promise<BackupPayload | null> {
  if (await hasBackupableData()) return null

  // Preferisci OPFS (copia completa con foto), poi localStorage (leggera).
  const opfs = tryParseBackupJson(await readRollingLocalBackupText())
  const local = tryParseBackupJson(localStorage.getItem(AUTO_SNAPSHOT_KEY))

  for (const candidate of [opfs, local]) {
    if (candidate && backupPayloadTotal(candidate) > 0) {
      await restoreBackup(candidate)
      return candidate
    }
  }
  return null
}

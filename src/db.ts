import Dexie, { type EntityTable } from 'dexie'
import { clearPwaCache } from './utils/appRecovery'

// ─── Tipi ────────────────────────────────────────────────────────────────────

export interface Note {
  id?: number
  title: string
  content: string
  /** Nota testuale o lista to-do con spunte */
  kind?: 'text' | 'checklist'
  color?: string
  photoBlob?: Blob
  startDate?: string
  endDate?: string
  areaId?: number
  createdAt: number
  updatedAt: number
}

export interface Expense {
  id?: number
  amount: number
  description: string
  category: string
  date: string
  createdAt: number
  paymentMethod?: PaymentMethod
  cardId?: number
  eventId?: number // collegamento a impegno/abbonamento
  areaId?: number
}

export type PaymentMethod = 'carta' | 'bonifico' | 'contanti' | 'altro'

/** Frequenza di ripetizione di un impegno ricorrente */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Event {
  id?: number
  title: string
  writtenNote: string
  voiceBlob?: Blob
  photoBlob?: Blob
  labels: string[]
  startDate: string
  endDate?: string
  durationDays?: number
  /** Giornaliera, settimanale, mensile, annuale */
  recurrenceFrequency?: RecurrenceFrequency
  renewalDate?: string
  color: string
  icon: string
  cost?: number
  received?: number
  paymentMethod: PaymentMethod
  cardId?: number
  areaId?: number
  createdAt: number
  updatedAt: number
}

export interface TaskList {
  id?: number
  title: string
  dueDate?: string
  createdAt: number
}

export interface Task {
  id?: number
  title: string
  done: boolean
  eventId?: number
  noteId?: number
  listId?: number
  dueDate?: string // ISO YYYY-MM-DD (solo attività singole senza lista)
  createdAt: number
  completedAt?: number
}

export interface PaymentCard {
  id?: number
  name: string
  digitsStart: string
  digitsEnd: string
  expiry: string
  createdAt: number
}

/** Ambito di vita trasversale (Casa, Auto, Famiglia…) */
export interface Area {
  id?: number
  name: string
  /** Raggruppa chip in Home (es. Lorenzo + Maria → gruppo Famiglia) */
  groupName?: string
  createdAt: number
}

export interface ArchiveItem {
  id?: number
  originalId: number
  type: 'note' | 'expense' | 'event' | 'task'
  title: string
  data: string
  photoBlob?: Blob
  voiceBlob?: Blob
  archivedAt: number
}

// ─── Database ─────────────────────────────────────────────────────────────────

class PersonalNotesDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  archive!: EntityTable<ArchiveItem, 'id'>
  events!: EntityTable<Event, 'id'>
  tasks!: EntityTable<Task, 'id'>
  taskLists!: EntityTable<TaskList, 'id'>
  paymentCards!: EntityTable<PaymentCard, 'id'>
  areas!: EntityTable<Area, 'id'>

  constructor() {
    super('PersonalNotesDB')

    this.version(1).stores({
      notes: '++id, title, createdAt, updatedAt',
      expenses: '++id, amount, category, date, createdAt',
      archive: '++id, type, originalId, archivedAt',
    })

    this.version(2).stores({
      notes: '++id, title, createdAt, updatedAt',
      expenses: '++id, amount, category, date, createdAt, cardId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId',
      tasks: '++id, done, createdAt',
      paymentCards: '++id, name',
    })

    this.version(3).stores({
      notes: '++id, title, createdAt, updatedAt',
      expenses: '++id, amount, category, date, createdAt, cardId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId',
      tasks: '++id, done, createdAt',
      paymentCards: '++id, name, expiry',
    }).upgrade((tx) =>
      tx.table('paymentCards').toCollection().modify((card) => {
        if (!card.digitsStart) card.digitsStart = ''
        if (!card.digitsEnd) card.digitsEnd = ''
        if (!card.expiry) card.expiry = ''
        delete card.color
      }),
    )

    // v4: spese collegate agli eventi
    this.version(4).stores({
      notes: '++id, title, createdAt, updatedAt',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId',
      tasks: '++id, done, createdAt',
      paymentCards: '++id, name, expiry',
    })

    // v5: attività collegate agli eventi
    this.version(5).stores({
      notes: '++id, title, createdAt, updatedAt',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId',
      tasks: '++id, done, createdAt, eventId',
      paymentCards: '++id, name, expiry',
    })

    // v6: data scadenza sulle attività
    this.version(6).stores({
      notes: '++id, title, createdAt, updatedAt',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId',
      tasks: '++id, done, createdAt, eventId, dueDate',
      paymentCards: '++id, name, expiry',
    })

    // v7: liste di attività raggruppate (es. spesa)
    this.version(7).stores({
      notes: '++id, title, createdAt, updatedAt',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId',
      tasks: '++id, done, createdAt, eventId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
    })

    // v8: date inizio/fine sulle note
    this.version(8).stores({
      notes: '++id, title, createdAt, updatedAt, startDate, endDate',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId',
      tasks: '++id, done, createdAt, eventId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
    })

    // v9: aree personali (Casa, Auto, Abbonamenti…)
    this.version(9).stores({
      notes: '++id, title, createdAt, updatedAt, startDate, endDate, areaId',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId, areaId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId, areaId',
      tasks: '++id, done, createdAt, eventId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
      areas: '++id, name, createdAt',
    })

    // v10: frequenza ripetizione impegni ricorrenti
    this.version(10).stores({
      notes: '++id, title, createdAt, updatedAt, startDate, endDate, areaId',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId, areaId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId, areaId',
      tasks: '++id, done, createdAt, eventId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
      areas: '++id, name, createdAt',
    })

    // v11: foto allegata alle note
    this.version(11).stores({
      notes: '++id, title, createdAt, updatedAt, startDate, endDate, areaId',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId, areaId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId, areaId',
      tasks: '++id, done, createdAt, eventId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
      areas: '++id, name, createdAt',
    })

    // v12: checklist sulle note (tasks.noteId)
    this.version(12).stores({
      notes: '++id, title, createdAt, updatedAt, startDate, endDate, areaId',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId, areaId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId, areaId',
      tasks: '++id, done, createdAt, eventId, noteId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
      areas: '++id, name, createdAt',
    })

    // v13: tipo esplicito nota vs lista to-do
    this.version(13).stores({
      notes: '++id, title, createdAt, updatedAt, startDate, endDate, areaId, kind',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId, areaId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId, areaId',
      tasks: '++id, done, createdAt, eventId, noteId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
      areas: '++id, name, createdAt',
    }).upgrade(async (tx) => {
      const notes = await tx.table('notes').toArray()
      const tasks = await tx.table('tasks').toArray()
      for (const note of notes) {
        if (!note.id || note.kind) continue
        const linked = tasks.filter(
          (t: { noteId?: number }) => t.noteId === note.id,
        )
        const lineCount = String(note.content ?? '')
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean).length
        const kind =
          linked.length >= 2 || lineCount >= 2 ? 'checklist' : 'text'
        await tx.table('notes').update(note.id, { kind })
      }
    })

    // v14: gruppi aree (es. Famiglia → Lorenzo, Maria…)
    this.version(14).stores({
      notes: '++id, title, createdAt, updatedAt, startDate, endDate, areaId, kind',
      expenses: '++id, amount, category, date, createdAt, cardId, eventId, areaId',
      archive: '++id, type, originalId, archivedAt',
      events: '++id, title, startDate, renewalDate, createdAt, updatedAt, cardId, areaId',
      tasks: '++id, done, createdAt, eventId, noteId, listId, dueDate',
      taskLists: '++id, createdAt, dueDate',
      paymentCards: '++id, name, expiry',
      areas: '++id, name, createdAt, groupName',
    })
  }
}

function createDB() {
  return new PersonalNotesDB()
}

/** Cancella e ricrea il DB (usato solo in caso di errore critico) */
export async function resetDB() {
  await Dexie.delete('PersonalNotesDB')
  await clearPwaCache()
  window.location.reload()
}

export const db = createDB()

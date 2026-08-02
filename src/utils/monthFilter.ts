import type { Event, Expense, Note } from '../db'
import { isNoteImpegno } from './impegno'
import { eventChargeDate } from './eventExpenses'

export function currentMonthBounds(): {
  startMs: number
  endMs: number
  label: string
} {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const label = start.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  })
  return { startMs: start.getTime(), endMs: end.getTime(), label }
}

function isoToMs(iso: string): number {
  return new Date(iso + 'T00:00:00').getTime()
}

export function isoInCurrentMonth(iso: string): boolean {
  const { startMs, endMs } = currentMonthBounds()
  const t = isoToMs(iso)
  return t >= startMs && t <= endMs
}

export function timestampInCurrentMonth(ts: number): boolean {
  const { startMs, endMs } = currentMonthBounds()
  return ts >= startMs && ts <= endMs
}

/** Periodo [start, end] sovrapposto al mese corrente */
export function periodOverlapsCurrentMonth(
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate) return false
  const { startMs, endMs } = currentMonthBounds()
  const itemStart = isoToMs(startDate)
  const itemEnd = endDate ? isoToMs(endDate) : itemStart
  return itemStart <= endMs && itemEnd >= startMs
}

export function eventInCurrentMonth(
  event: Pick<Event, 'startDate' | 'endDate' | 'renewalDate' | 'updatedAt'>,
): boolean {
  return eventInHomeMonth(event)
}

/** Impegni/eventi visibili in Home: periodo o rinnovo nel mese corrente (non per data modifica). */
export function eventInHomeMonth(
  event: Pick<Event, 'startDate' | 'endDate' | 'renewalDate'>,
): boolean {
  if (event.renewalDate && isoInCurrentMonth(event.renewalDate)) return true
  return periodOverlapsCurrentMonth(event.startDate, event.endDate)
}

export function noteInCurrentMonth(
  note: Pick<Note, 'startDate' | 'endDate' | 'updatedAt' | 'kind' | 'content'>,
): boolean {
  return noteInHomeMonth(note)
}

/** Note/liste in Home: sempre visibili, anche con data inizio lontana. */
export function noteInHomeMonth(
  note: Pick<Note, 'startDate' | 'endDate' | 'updatedAt'> &
    Partial<Pick<Note, 'kind' | 'content'>>,
): boolean {
  if (isNoteImpegno(note)) {
    return periodOverlapsCurrentMonth(note.startDate, note.endDate)
  }
  return true
}

export function eventMapById(events: Event[]): Map<number, Event> {
  const map = new Map<number, Event>()
  for (const event of events) {
    if (event.id != null) map.set(event.id, event)
  }
  return map
}

/** Data di addebito effettiva: per spese da impegno usa rinnovo/inizio impegno. */
export function effectiveExpenseChargeDate(
  expense: Pick<Expense, 'date' | 'eventId'>,
  eventsById: Map<number, Event>,
): string {
  if (expense.eventId != null) {
    const event = eventsById.get(expense.eventId)
    if (event) return eventChargeDate(event)
  }
  return expense.date
}

export function expenseInCurrentMonth(expense: Pick<Expense, 'date'>): boolean {
  return expenseInHomeMonth(expense)
}

export function expenseInCurrentMonthWithEvents(
  expense: Pick<Expense, 'date' | 'eventId'>,
  events: Event[],
): boolean {
  return isoInCurrentMonth(
    effectiveExpenseChargeDate(expense, eventMapById(events)),
  )
}

/** Spese in Home: solo data pagamento nel mese corrente. */
export function expenseInHomeMonth(expense: Pick<Expense, 'date'>): boolean {
  return isoInCurrentMonth(expense.date)
}

/** Chiave mese YYYY-MM da data ISO */
export function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7)
}

/** Etichetta leggibile da chiave YYYY-MM (es. "giugno 2026") */
export function monthLabelFromKey(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  })
}

/** Raggruppa spese per mese, dal più recente */
export function groupExpensesByMonth<T extends Pick<Expense, 'date'>>(
  expenses: T[],
): { key: string; label: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const e of expenses) {
    const key = monthKeyFromIso(e.date)
    const list = map.get(key) ?? []
    list.push(e)
    map.set(key, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({
      key,
      label: monthLabelFromKey(key),
      items: [...items].sort((a, b) => a.date.localeCompare(b.date)),
    }))
}

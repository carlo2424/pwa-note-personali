import type { Event, Expense, Note } from '../db'
import { isNoteImpegno } from './impegno'

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
  if (timestampInCurrentMonth(event.updatedAt)) return true
  if (periodOverlapsCurrentMonth(event.startDate, event.endDate)) return true
  if (event.renewalDate && isoInCurrentMonth(event.renewalDate)) return true
  return false
}

export function noteInCurrentMonth(
  note: Pick<Note, 'startDate' | 'endDate' | 'updatedAt'>,
): boolean {
  if (isNoteImpegno(note)) {
    return periodOverlapsCurrentMonth(note.startDate, note.endDate)
  }
  if (note.endDate && isoInCurrentMonth(note.endDate)) return true
  if (note.startDate && isoInCurrentMonth(note.startDate)) return true
  return timestampInCurrentMonth(note.updatedAt)
}

export function expenseInCurrentMonth(expense: Pick<Expense, 'date'>): boolean {
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
      items: [...items].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    }))
}

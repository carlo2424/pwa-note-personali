import type { Event, Expense, Note } from '../db'
import { daysUntil } from './countdown'
import { filterEventImpegni, filterNoteImpegni, filterPlainNotes } from './impegno'
import { noteDateUrgency, noteKeyDate, urgencyRank } from './homeSpotlight'

/** Giorni senza attività recente → Home minimal (solo card spese) */
export const HOME_FRESH_DAYS = 2

export type HomeFeedItem =
  | { kind: 'note'; item: Note; activityAt: number }
  | { kind: 'event'; item: Event; activityAt: number }
  | { kind: 'expense'; item: Expense; activityAt: number }

function freshCutoffMs(): number {
  return Date.now() - HOME_FRESH_DAYS * 24 * 60 * 60 * 1000
}

export function isRecentlyActive(timestamp: number): boolean {
  return timestamp >= freshCutoffMs()
}

function noteIsImminent(note: Pick<Note, 'startDate' | 'endDate'>): boolean {
  const urg = noteDateUrgency(note)
  return urg === 'expired' || urg === 'today' || urg === 'soon'
}

function eventIsImminent(
  event: Pick<Event, 'startDate' | 'endDate' | 'renewalDate'>,
): boolean {
  for (const iso of [event.renewalDate, event.endDate, event.startDate]) {
    if (!iso) continue
    if (daysUntil(iso) <= 7) return true
  }
  return false
}

function feedItemIsImminent(item: HomeFeedItem): boolean {
  if (item.kind === 'note') return noteIsImminent(item.item)
  if (item.kind === 'event') return eventIsImminent(item.item)
  return false
}

function compareFeedItems(a: HomeFeedItem, b: HomeFeedItem): number {
  const ia = feedItemIsImminent(a)
  const ib = feedItemIsImminent(b)
  if (ia !== ib) return ia ? -1 : 1

  if (a.kind === 'note' && b.kind === 'note') {
    const ra = urgencyRank(noteDateUrgency(a.item))
    const rb = urgencyRank(noteDateUrgency(b.item))
    if (ra !== rb) return ra - rb
    const da = noteKeyDate(a.item)
    const db = noteKeyDate(b.item)
    if (da && db && da !== db) return da.localeCompare(db)
  }

  return b.activityAt - a.activityAt
}

export function buildHomeFeedItems(
  notes: Note[],
  events: Event[],
  expenses: Expense[],
): HomeFeedItem[] {
  const items: HomeFeedItem[] = []

  for (const note of filterPlainNotes(notes)) {
    items.push({ kind: 'note', item: note, activityAt: note.updatedAt })
  }
  for (const note of filterNoteImpegni(notes)) {
    items.push({ kind: 'note', item: note, activityAt: note.updatedAt })
  }
  for (const event of filterEventImpegni(events)) {
    items.push({
      kind: 'event',
      item: event,
      activityAt: event.updatedAt,
    })
  }
  for (const expense of expenses) {
    items.push({
      kind: 'expense',
      item: expense,
      activityAt: expense.createdAt,
    })
  }

  return items
    .filter(
      (item) =>
        isRecentlyActive(item.activityAt) || feedItemIsImminent(item),
    )
    .sort(compareFeedItems)
}

export function isHomeFeedQuiet(
  notes: Note[],
  events: Event[],
  expenses: Expense[],
): boolean {
  const hasRecent =
    notes.some((n) => isRecentlyActive(n.updatedAt)) ||
    events.some((e) => isRecentlyActive(e.updatedAt)) ||
    expenses.some((e) => isRecentlyActive(e.createdAt))

  if (hasRecent) return false

  const hasImminent =
    filterPlainNotes(notes).some(noteIsImminent) ||
    filterNoteImpegni(notes).some(noteIsImminent) ||
    filterEventImpegni(events).some(eventIsImminent)

  return !hasImminent
}

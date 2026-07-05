import type { Event, Expense, Note } from '../db'
import { filterPlainNotes } from './impegno'
import {
  compareDeadlineIso,
  eventDeadlineIso,
  noteKeyDate,
} from './homeSpotlight'
import {
  eventInHomeMonth,
  expenseInHomeMonth,
  noteInHomeMonth,
} from './monthFilter'

export type HomeFeedItem =
  | { kind: 'note'; item: Note; activityAt: number }
  | { kind: 'event'; item: Event; activityAt: number }
  | { kind: 'expense'; item: Expense; activityAt: number }

function itemInHomeMonth(item: HomeFeedItem): boolean {
  if (item.kind === 'expense') return expenseInHomeMonth(item.item)
  if (item.kind === 'event') return eventInHomeMonth(item.item)
  return noteInHomeMonth(item.item)
}

export function feedItemDeadlineIso(item: HomeFeedItem): string | undefined {
  if (item.kind === 'note') return noteKeyDate(item.item)
  if (item.kind === 'event') return eventDeadlineIso(item.item)
  return item.item.date
}

function compareFeedItems(a: HomeFeedItem, b: HomeFeedItem): number {
  return compareDeadlineIso(
    feedItemDeadlineIso(a),
    feedItemDeadlineIso(b),
    b.activityAt - a.activityAt,
  )
}

export function buildHomeFeedItems(notes: Note[]): HomeFeedItem[] {
  const items: HomeFeedItem[] = []

  for (const note of filterPlainNotes(notes)) {
    items.push({ kind: 'note', item: note, activityAt: note.updatedAt })
  }

  return items.filter(itemInHomeMonth).sort(compareFeedItems)
}

export function isHomeFeedQuiet(notes: Note[]): boolean {
  const items: HomeFeedItem[] = []
  for (const note of filterPlainNotes(notes)) {
    if (noteInHomeMonth(note)) items.push({ kind: 'note', item: note, activityAt: note.updatedAt })
  }
  return items.length === 0
}

export function sortExpensesByDeadline<T extends Pick<Expense, 'date'>>(
  expenses: T[],
): T[] {
  return [...expenses].sort((a, b) => a.date.localeCompare(b.date))
}

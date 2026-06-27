import type { Event, Note } from '../db'

/** Data inizio + data fine = impegno (per note, eventi, ecc.) */
export function hasImpegnoPeriod(item: {
  startDate?: string
  endDate?: string
}): boolean {
  return !!(item.startDate && item.endDate)
}

export function isEventImpegno(
  event: Pick<Event, 'startDate' | 'endDate'>,
): boolean {
  return hasImpegnoPeriod(event)
}

export function isNoteImpegno(note: Pick<Note, 'startDate' | 'endDate'>): boolean {
  return hasImpegnoPeriod(note)
}

export function filterEventImpegni<
  T extends Pick<Event, 'startDate' | 'endDate'>,
>(events: T[]): T[] {
  return events.filter(isEventImpegno)
}

export function filterNoteImpegni<
  T extends Pick<Note, 'startDate' | 'endDate'>,
>(notes: T[]): T[] {
  return notes.filter(isNoteImpegno)
}

export function filterPlainNotes<
  T extends Pick<Note, 'startDate' | 'endDate'>,
>(notes: T[]): T[] {
  return notes.filter((n) => !isNoteImpegno(n))
}

import type { Event, Note } from '../db'

/** Data inizio + data fine = impegno (solo eventi). */
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

/** Note e liste restano nelle rispettive sezioni (solo data inizio opzionale). */
export function isNoteImpegno(
  _note: Pick<Note, 'startDate' | 'endDate'> &
    Partial<Pick<Note, 'kind' | 'content'>>,
): boolean {
  return false
}

export function filterEventImpegni<
  T extends Pick<Event, 'startDate' | 'endDate'>,
>(events: T[]): T[] {
  return events.filter(isEventImpegno)
}

export function filterNoteImpegni<
  T extends Pick<Note, 'startDate' | 'endDate'> &
    Partial<Pick<Note, 'kind' | 'content'>>,
>(notes: T[]): T[] {
  return notes.filter(isNoteImpegno)
}

export function filterPlainNotes<
  T extends Pick<Note, 'startDate' | 'endDate'> &
    Partial<Pick<Note, 'kind' | 'content'>>,
>(notes: T[]): T[] {
  return notes.filter((n) => !isNoteImpegno(n))
}

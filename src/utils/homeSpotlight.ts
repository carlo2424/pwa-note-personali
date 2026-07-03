import type { Event, Note } from '../db'
import { countdownUrgency, daysUntil } from './countdown'

export type DateUrgency = ReturnType<typeof countdownUrgency>

/** Etichetta breve per scadenze imminenti (liste, impegni, note) */
export function deadlineLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days < 0) return `Scaduto ${Math.abs(days)} gg fa`
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Domani'
  if (days <= 7) return `Tra ${days} giorni`
  return ''
}

export function noteKeyDate(
  note: Pick<Note, 'endDate' | 'startDate'>,
): string | undefined {
  return note.endDate ?? note.startDate
}

export function noteDateUrgency(
  note: Pick<Note, 'endDate' | 'startDate'>,
): DateUrgency | null {
  const iso = noteKeyDate(note)
  if (!iso) return null
  const days = daysUntil(iso)
  if (days > 7) return 'ok'
  return countdownUrgency(iso)
}

export function urgencyRank(urgency: DateUrgency | null): number {
  if (urgency === 'expired') return 0
  if (urgency === 'today') return 1
  if (urgency === 'soon') return 2
  return 3
}

export function sortNotesByUrgency(a: Note, b: Note): number {
  return compareDeadlineIso(
    noteKeyDate(a),
    noteKeyDate(b),
    b.updatedAt - a.updatedAt,
  )
}

export function eventDeadlineIso(
  event: Pick<Event, 'startDate' | 'endDate' | 'renewalDate'>,
): string {
  return event.renewalDate ?? event.endDate ?? event.startDate
}

/** Scadenza più vicina prima; voci senza scadenza in fondo. */
export function compareDeadlineIso(
  isoA: string | undefined,
  isoB: string | undefined,
  tieBreak = 0,
): number {
  if (isoA && !isoB) return -1
  if (!isoA && isoB) return 1
  if (!isoA && !isoB) return tieBreak

  const daysA = daysUntil(isoA!)
  const daysB = daysUntil(isoB!)
  if (daysA !== daysB) return daysA - daysB
  const byDate = isoA!.localeCompare(isoB!)
  if (byDate !== 0) return byDate
  return tieBreak
}

export interface Spotlight {
  title: string
  hint?: string
  urgent?: boolean
}

export function noteSpotlight(
  note: Note,
  areaName?: string,
  checklistPreview?: string,
): Spotlight {
  const urgentUrg = noteDateUrgency(note)
  const urgent =
    urgentUrg === 'expired' ||
    urgentUrg === 'today' ||
    urgentUrg === 'soon'
  const deadline = noteKeyDate(note) ? deadlineLabel(noteKeyDate(note)!) : ''
  const hints = [checklistPreview, deadline].filter(Boolean)
  return {
    title: areaName ?? note.title,
    hint: hints.length > 0 ? hints.join(' · ') : note.title,
    urgent,
  }
}

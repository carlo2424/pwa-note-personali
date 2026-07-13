import type { Note } from '../db'
import { daysUntil, isPastDue } from './countdown'
import { isNoteImpegno } from './impegno'
import { noteKeyDate } from './homeSpotlight'
import {
  isoInCurrentMonth,
  periodOverlapsCurrentMonth,
  timestampInCurrentMonth,
} from './monthFilter'

/** Entro quanti giorni un promemoria resta visibile in Home anche fuori dal mese corrente */
export const HOME_REMINDER_HORIZON_DAYS = 7

function isImminent(iso: string): boolean {
  return daysUntil(iso) <= HOME_REMINDER_HORIZON_DAYS
}

/**
 * Una nota/lista compare in Home se:
 * - senza date: aggiornata nel mese corrente
 * - con date (promemoria/impegno): periodo nel mese, scaduta, o scadenza/inizio imminente
 */
export function noteVisibleOnHome(
  note: Pick<Note, 'startDate' | 'endDate' | 'updatedAt'> &
    Partial<Pick<Note, 'kind' | 'content'>>,
): boolean {
  const key = noteKeyDate(note)

  if (!key && !note.startDate) {
    return timestampInCurrentMonth(note.updatedAt)
  }

  if (isNoteImpegno(note)) {
    if (periodOverlapsCurrentMonth(note.startDate, note.endDate)) return true
    if (note.endDate && (isPastDue(note.endDate) || isImminent(note.endDate))) {
      return true
    }
    if (note.startDate && isImminent(note.startDate)) return true
    return false
  }

  if (key) {
    if (isoInCurrentMonth(key)) return true
    if (isPastDue(key) || isImminent(key)) return true
  }

  return timestampInCurrentMonth(note.updatedAt)
}

/** Eventi/impegni con date imminenti o nel mese corrente */
export function eventVisibleOnHome(
  event: Pick<
    import('../db').Event,
    'startDate' | 'endDate' | 'renewalDate' | 'updatedAt'
  >,
): boolean {
  if (event.renewalDate) {
    if (isoInCurrentMonth(event.renewalDate)) return true
    if (isPastDue(event.renewalDate) || isImminent(event.renewalDate)) {
      return true
    }
  }
  if (periodOverlapsCurrentMonth(event.startDate, event.endDate)) return true
  if (event.endDate && (isPastDue(event.endDate) || isImminent(event.endDate))) {
    return true
  }
  if (event.startDate && isImminent(event.startDate)) return true
  if (timestampInCurrentMonth(event.updatedAt)) return true
  return false
}

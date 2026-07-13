import type { Note } from '../db'
import { daysUntil, isPastDue } from './countdown'
import {
  isoInCurrentMonth,
  noteInHomeMonth,
  periodOverlapsCurrentMonth,
  timestampInCurrentMonth,
} from './monthFilter'

/** Entro quanti giorni un promemoria resta visibile in Home anche fuori dal mese corrente */
export const HOME_REMINDER_HORIZON_DAYS = 7

function isImminent(iso: string): boolean {
  return daysUntil(iso) <= HOME_REMINDER_HORIZON_DAYS
}

/**
 * Una nota/lista compare in Home se aggiornata nel mese corrente oppure ha una
 * data (anche lontana). In pratica le note/liste restano sempre in Home.
 */
export function noteVisibleOnHome(
  note: Pick<Note, 'startDate' | 'endDate' | 'updatedAt'> &
    Partial<Pick<Note, 'kind' | 'content'>>,
): boolean {
  return noteInHomeMonth(note)
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

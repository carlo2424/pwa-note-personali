import type { Event, RecurrenceFrequency } from '../db'
import { isEventImpegno } from './impegno'

export const RECURRENCE_OPTIONS: {
  value: RecurrenceFrequency
  label: string
  short: string
}[] = [
  { value: 'daily', label: 'Giornaliera', short: 'giorno' },
  { value: 'weekly', label: 'Settimanale', short: 'settimana' },
  { value: 'monthly', label: 'Mensile', short: 'mese' },
  { value: 'yearly', label: 'Annuale', short: 'anno' },
]

export function recurrenceLabel(
  freq?: RecurrenceFrequency,
): string | undefined {
  return RECURRENCE_OPTIONS.find((o) => o.value === freq)?.label
}

export function recurrenceShort(freq?: RecurrenceFrequency): string | undefined {
  return RECURRENCE_OPTIONS.find((o) => o.value === freq)?.short
}

/**
 * Impegno (evento): data inizio + data fine.
 * La frequenza è opzionale (per abbonamenti ricorrenti).
 */
export function isRecurringCommitment(
  event: Pick<Event, 'startDate' | 'endDate'>,
): boolean {
  return isEventImpegno(event)
}

export function filterRecurringCommitments<T extends Event>(events: T[]): T[] {
  return events.filter(isRecurringCommitment)
}

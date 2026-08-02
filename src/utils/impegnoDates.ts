import type { RecurrenceFrequency } from '../db'
import { isPastDue, todayIso } from './countdown'

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addRecurrence(date: Date, freq: RecurrenceFrequency): Date {
  const next = new Date(date)
  switch (freq) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

/** Prossimo addebito: prima occorrenza da startDate in poi (>= oggi). */
export function computeNextRenewalDate(
  startDate: string,
  frequency: RecurrenceFrequency,
  referenceDate: Date = new Date(),
): string {
  if (!startDate) return ''

  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )
  let current = parseIsoDate(startDate)

  while (current < ref) {
    current = addRecurrence(current, frequency)
  }

  return toIsoDateLocal(current)
}

/** Ultima occorrenza ricorrente con scadenza <= oggi (inclusa la data di inizio). */
export function lastRecurrenceDueOnOrBeforeToday(
  startDate: string,
  frequency: RecurrenceFrequency,
): string | undefined {
  const today = todayIso()
  if (!startDate || startDate > today) return undefined

  let current = parseIsoDate(startDate)
  let lastDue = startDate

  for (;;) {
    const iso = toIsoDateLocal(current)
    if (iso > today) break
    lastDue = iso
    current = addRecurrence(current, frequency)
  }

  return lastDue
}

/** Ultimo addebito ricorrente ≤ oggi, senza superare la fine definitiva impegno. */
export function lastRecurrenceDueOnOrBeforeTodayCapped(
  startDate: string,
  frequency: RecurrenceFrequency,
  definitiveEnd?: string,
): string | undefined {
  const lastDue = lastRecurrenceDueOnOrBeforeToday(startDate, frequency)
  if (!lastDue) return undefined
  if (definitiveEnd && lastDue > definitiveEnd) {
    let current = parseIsoDate(startDate)
    let capped: string | undefined
    for (;;) {
      const iso = toIsoDateLocal(current)
      if (definitiveEnd && iso > definitiveEnd) break
      if (iso > todayIso()) break
      capped = iso
      current = addRecurrence(current, frequency)
    }
    return capped
  }
  return lastDue
}

/** Corregge rinnovi saltati in avanti rispetto a inizio + frequenza (bug checkbox precedente). */
export function repairCorruptedRenewalPatch(event: {
  startDate?: string
  renewalDate?: string
  recurrenceFrequency?: RecurrenceFrequency
  completedAt?: number
}): { renewalDate: string; completedAt?: undefined } | null {
  if (!event.recurrenceFrequency || !event.startDate || !event.renewalDate) {
    return null
  }

  const canonical = computeNextRenewalDate(
    event.startDate,
    event.recurrenceFrequency,
  )
  if (!canonical || event.renewalDate <= canonical) return null

  const lastDue = lastRecurrenceDueOnOrBeforeToday(
    event.startDate,
    event.recurrenceFrequency,
  )

  const patch: { renewalDate: string; completedAt?: undefined } = {
    renewalDate: canonical,
  }

  if (event.completedAt && lastDue && isPastDue(lastDue)) {
    patch.completedAt = undefined
  }

  return patch
}

/** Data fine inclusiva da durata in giorni (es. 1 giorno = stesso giorno di inizio). */
export function computeEndDateFromDuration(
  startDate: string,
  durationDays: number,
): string {
  if (!startDate || durationDays < 1) return ''
  const end = parseIsoDate(startDate)
  end.setDate(end.getDate() + durationDays - 1)
  return toIsoDateLocal(end)
}

export function computeDurationFromRange(
  startDate: string,
  endDate: string,
): number | null {
  if (!startDate || !endDate) return null
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  if (end < start) return null
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

/** Ultimo giorno del periodo corrispondente alla frequenza (inizio incluso). */
export function computeEndDateFromFrequency(
  startDate: string,
  frequency: RecurrenceFrequency,
): string {
  if (!startDate) return ''
  const periodEnd = addRecurrence(parseIsoDate(startDate), frequency)
  periodEnd.setDate(periodEnd.getDate() - 1)
  return toIsoDateLocal(periodEnd)
}

export interface ImpegnoPeriodPatch {
  renewalDate?: string
  endDate?: string
  durationDays?: string
}

export interface ImpegnoPeriodManual {
  renewal: boolean
  end: boolean
  duration: boolean
}

/**
 * Calcola i campi derivati da data inizio + frequenza (+ durata opzionale).
 * Rispetta i flag manual: non sovrascrive i campi segnati come modificati a mano.
 */
export function deriveImpegnoPeriodFields(
  startDate: string,
  frequency: RecurrenceFrequency | '',
  durationDays: string,
  manual: ImpegnoPeriodManual,
): ImpegnoPeriodPatch {
  const patch: ImpegnoPeriodPatch = {}
  if (!startDate) return patch

  if (frequency) {
    if (!manual.renewal) {
      patch.renewalDate = computeNextRenewalDate(startDate, frequency)
    }
    if (!manual.end) {
      patch.endDate = computeEndDateFromFrequency(startDate, frequency)
    }
    if (!manual.duration) {
      const days = computeDurationFromRange(
        startDate,
        patch.endDate ?? computeEndDateFromFrequency(startDate, frequency),
      )
      if (days != null) patch.durationDays = String(days)
    }
    return patch
  }

  const parsedDuration = durationDays ? parseInt(durationDays, 10) : NaN
  if (!manual.end && !isNaN(parsedDuration) && parsedDuration > 0) {
    patch.endDate = computeEndDateFromDuration(startDate, parsedDuration)
  }

  return patch
}

/** Allinea data fine se precedente alla data inizio. */
export function clampEndDateToStart(
  startDate: string,
  endDate: string,
): string {
  if (!startDate || !endDate) return endDate
  return endDate < startDate ? startDate : endDate
}

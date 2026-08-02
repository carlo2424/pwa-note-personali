import type { Event, Note } from '../db'
import { formatModifiedLong } from './format'
import { countdownUrgency, daysUntil } from './countdown'
import { impegnoScadenzaDate } from './eventExpenses'

export type HomeDeadlineTone = 'today' | 'overdue' | 'soon' | 'default'

export interface HomeDeadlineLine {
  label: string
  tone: HomeDeadlineTone
  iso?: string
  /** Solo per righe «Ultima modifica» in Home */
  alignRight?: boolean
  /** Testo secondario sulla stessa riga del titolo (es. ultima modifica a destra) */
  inlineRight?: string
}

export function deadlineToneClassName(tone: HomeDeadlineTone): string {
  if (tone === 'today' || tone === 'overdue') {
    return 'font-semibold text-rose-600'
  }
  if (tone === 'soon') return 'font-medium text-amber-700'
  return 'text-slate-500'
}

/** Scadenze da oggi fino a 7 giorni inclusi */
export function isDeadlineThisWeek(iso: string): boolean {
  const days = daysUntil(iso)
  return days >= 0 && days <= 7
}

export function homeDeadlineWhenWord(iso: string): string {
  const days = daysUntil(iso)
  if (days < 0) return 'scaduto'
  if (days === 0) return 'oggi'
  if (days === 1) return 'domani'
  if (days <= 7) return `tra ${days} giorni`
  return ''
}

export function formatHomeDeadlineDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function buildHomeDeadlineLine(
  title: string,
  iso: string,
): HomeDeadlineLine {
  const days = daysUntil(iso)
  const when = homeDeadlineWhenWord(iso)
  const date = formatHomeDeadlineDate(iso)
  const label = when ? `${title} - ${when} ${date}` : `${title} - ${date}`
  let tone: HomeDeadlineTone = 'default'
  if (days < 0) tone = 'overdue'
  else if (days === 0) tone = 'today'
  else if (days <= 7) tone = 'soon'
  return { label, tone, iso }
}

/** Card Home Impegni: oggi/scaduto in rosso, scadenze vicine (entro 7 gg) in amber. */
export interface HomeImpegniCardLinesResult {
  lines: HomeDeadlineLine[]
  hiddenCount: number
}

export function buildHomeImpegniCardLines(
  items: { title: string; iso: string }[],
): HomeImpegniCardLinesResult {
  const dated = [...items]
    .filter((item) => item.iso)
    .sort((a, b) =>
      compareDeadlineIso(a.iso, b.iso, a.title.localeCompare(b.title, 'it-IT')),
    )

  const todayItems = dated.filter((item) => daysUntil(item.iso) === 0)
  const futureItems = dated.filter((item) => daysUntil(item.iso) > 0)

  const lines: HomeDeadlineLine[] = []

  for (const item of todayItems) {
    lines.push(buildHomeDeadlineLine(item.title, item.iso))
  }

  const nextDateIso = futureItems[0]?.iso
  const nextDateItems = nextDateIso
    ? futureItems.filter((item) => item.iso === nextDateIso)
    : []
  const laterItems = nextDateIso
    ? futureItems.filter((item) => item.iso !== nextDateIso)
    : []

  for (const item of nextDateItems) {
    // Mantiene il colore naturale: «tra N giorni» in amber, non grigio.
    lines.push(buildHomeDeadlineLine(item.title, item.iso))
  }

  if (lines.length === 0) {
    const overdue = dated.filter((item) => daysUntil(item.iso) < 0)
    for (const item of overdue) {
      lines.push(buildHomeDeadlineLine(item.title, item.iso))
    }
    return { lines, hiddenCount: 0 }
  }

  return { lines, hiddenCount: laterItems.length }
}

export function sortHomeDeadlineLines(lines: HomeDeadlineLine[]): HomeDeadlineLine[] {
  return [...lines].sort((a, b) => {
    if (a.iso && b.iso) {
      const byDate = a.iso.localeCompare(b.iso)
      if (byDate !== 0) return byDate
    }
    const toneRank = (t: HomeDeadlineTone) =>
      t === 'today' ? 0 : t === 'overdue' ? 1 : t === 'soon' ? 2 : 3
    return toneRank(a.tone) - toneRank(b.tone)
  })
}

export function noteSummaryLineTone(
  note: Pick<Note, 'endDate' | 'startDate'>,
): HomeDeadlineTone {
  const iso = noteKeyDate(note)
  if (!iso || !isDeadlineThisWeek(iso)) return 'default'
  const days = daysUntil(iso)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  return 'soon'
}

/** Riga riepilogo Home: titolo voce + ultima modifica */
export function buildHomeItemSummaryLine(
  title: string,
  updatedAt: number,
  tone: HomeDeadlineTone = 'default',
): HomeDeadlineLine[] {
  return [
    { label: title, tone },
    {
      label: formatModifiedLong(updatedAt),
      tone: 'default',
      alignRight: true,
    },
  ]
}

/** Card Home Note/Liste: titolo + modifica a destra, sotto data inizio. */
export function buildHomeStartDateSummaryLine(
  title: string,
  updatedAt: number,
  startDate?: string,
): HomeDeadlineLine[] {
  const lines: HomeDeadlineLine[] = [
    {
      label: title,
      tone: 'default',
      inlineRight: formatModifiedLong(updatedAt),
    },
  ]

  if (startDate) {
    const when = homeDeadlineWhenWord(startDate)
    const date = formatHomeDeadlineDate(startDate)
    const days = daysUntil(startDate)
    let tone: HomeDeadlineTone = 'default'
    if (days < 0) tone = 'overdue'
    else if (days === 0) tone = 'today'
    else if (days <= 7) tone = 'soon'
    lines.push({
      label: when ? `Inizio ${when} ${date}` : `Inizio ${date}`,
      tone,
      iso: startDate,
    })
  }

  return lines
}

export type DateUrgency = ReturnType<typeof countdownUrgency>

/** Etichetta breve per scadenze imminenti (liste, impegni, note) */
export function deadlineLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days < 0) return `Scaduto ${Math.abs(days)} giorni fa`
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
  event: Pick<
    Event,
    'startDate' | 'endDate' | 'renewalDate' | 'recurrenceFrequency'
  >,
): string {
  return impegnoScadenzaDate(event)
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

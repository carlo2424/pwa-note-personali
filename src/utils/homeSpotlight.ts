import type { Event, Note } from '../db'
import { formatModifiedAt } from './format'
import { countdownUrgency, daysUntil } from './countdown'

export type HomeDeadlineTone = 'today' | 'overdue' | 'soon' | 'default'

export interface HomeDeadlineLine {
  label: string
  tone: HomeDeadlineTone
  iso?: string
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
): HomeDeadlineLine {
  return {
    label: `${title} · ${formatModifiedAt(updatedAt)}`,
    tone,
  }
}

export interface ImpegniHomeCardLines {
  todayLines: HomeDeadlineLine[]
  nextLine: HomeDeadlineLine | null
}

/** Card Impegni chiusa: oggi (se presente) + prossima scadenza. */
export function buildImpegniHomeCardLines(
  items: { title: string; iso: string }[],
): ImpegniHomeCardLines {
  const allLines = items
    .filter((item) => item.iso)
    .map((item) => buildHomeDeadlineLine(item.title, item.iso))

  if (allLines.length === 0) {
    return { todayLines: [], nextLine: null }
  }

  const sorted = sortHomeDeadlineLines(allLines)
  const todayLines = sorted.filter(
    (line) => line.iso != null && daysUntil(line.iso) === 0,
  )

  if (todayLines.length === 0) {
    return { todayLines: [], nextLine: sorted[0] ?? null }
  }

  const nextLine =
    sorted.find((line) => line.iso != null && daysUntil(line.iso) > 0) ?? null

  return { todayLines, nextLine }
}

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

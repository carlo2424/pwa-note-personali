import type { Event } from '../db'

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function safeFileName(title: string): string {
  return title.replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 80) || 'impegno'
}

/** Date evento tutto il giorno (fine esclusiva, standard iCal) */
function icsDateRange(event: Event): { start: string; end: string } {
  const startIso = event.renewalDate ?? event.startDate
  const endExclusive =
    event.endDate && !event.renewalDate
      ? addDaysIso(event.endDate, 1)
      : addDaysIso(startIso, 1)

  return {
    start: startIso.replace(/-/g, ''),
    end: endExclusive.replace(/-/g, ''),
  }
}

function buildDescription(event: Event): string {
  const lines: string[] = []
  if (event.writtenNote?.trim()) lines.push(event.writtenNote.trim())
  if (event.renewalDate) lines.push(`Rinnovo: ${event.renewalDate}`)
  if (event.startDate && event.renewalDate !== event.startDate) {
    lines.push(`Inizio: ${event.startDate}`)
  }
  if (event.endDate) lines.push(`Fine: ${event.endDate}`)
  if (event.cost != null) lines.push(`Costo: ${event.cost}`)
  if (event.labels.length > 0) lines.push(event.labels.join(', '))
  lines.push('— Note Personali')
  return lines.join('\n')
}

/** Genera contenuto iCalendar (.ics) compatibile con le app calendario */
export function buildICS(event: Event): string {
  const uid = `impegno-${event.id ?? Date.now()}@note-personali`
  const { start, end } = icsDateRange(event)
  const now = new Date()
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Note Personali//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(buildDescription(event))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function downloadICSFile(event: Event, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFileName(event.title)}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Aggiunge l'impegno al calendario del dispositivo.
 * Su mobile: condivisione → app Calendario predefinita.
 * Su desktop: scarica .ics da importare.
 */
export async function addToCalendar(event: Event): Promise<void> {
  const ics = buildICS(event)
  const fileName = `${safeFileName(event.title)}.ics`
  const file = new File([ics], fileName, { type: 'text/calendar' })

  if (typeof navigator.share === 'function') {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: event.title,
          text: 'Aggiungi al calendario',
        })
        return
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    }
  }

  downloadICSFile(event, ics)
}

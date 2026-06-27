import type { Event, Expense, Note, PaymentMethod } from '../db'
import {
  formatAmount,
  formatDateRange,
  formatIsoDate,
  sentenceCase,
} from './format'
import { recurrenceLabel, recurrenceShort } from './recurring'

const METHOD_LABELS: Record<PaymentMethod, string> = {
  carta: 'Carta',
  bonifico: 'Bonifico',
  contanti: 'Contanti',
  altro: 'Altro',
}

function appendLine(lines: string[], label: string, value?: string | null) {
  if (!value?.trim()) return
  lines.push(`${label}: ${value.trim()}`)
}

export function formatNoteShare(
  note: Note,
  areaName?: string,
): { title: string; text: string } {
  const title = sentenceCase(note.title)
  const lines = ['📝 Nota — Note Personali', '', title]
  appendLine(lines, 'Area', areaName)
  const period = formatDateRange(note.startDate, note.endDate)
  appendLine(lines, 'Periodo', period)
  if (note.content?.trim()) {
    lines.push('', sentenceCase(note.content))
  }
  return { title, text: lines.join('\n') }
}

export function formatEventShare(
  event: Event,
  areaName?: string,
): { title: string; text: string } {
  const title = sentenceCase(event.title)
  const lines = ['📅 Impegno — Note Personali', '', title]
  appendLine(lines, 'Area', areaName)
  appendLine(lines, 'Inizio', formatIsoDate(event.startDate))
  appendLine(lines, 'Fine', event.endDate ? formatIsoDate(event.endDate) : null)
  appendLine(
    lines,
    'Ripetizione',
    event.recurrenceFrequency
      ? recurrenceLabel(event.recurrenceFrequency)
      : null,
  )
  appendLine(
    lines,
    'Prossimo addebito',
    event.renewalDate ? formatIsoDate(event.renewalDate) : null,
  )
  if (event.cost != null && event.cost > 0) {
    const freq = recurrenceShort(event.recurrenceFrequency)
    appendLine(
      lines,
      'Costo',
      freq
        ? `${formatAmount(event.cost)}/${freq}`
        : formatAmount(event.cost),
    )
  }
  if (event.received != null && event.received > 0) {
    appendLine(lines, 'Ricevuto', formatAmount(event.received))
  }
  if (event.labels.length > 0) {
    appendLine(lines, 'Etichette', event.labels.map(sentenceCase).join(', '))
  }
  if (event.writtenNote?.trim()) {
    lines.push('', sentenceCase(event.writtenNote))
  }
  return { title, text: lines.join('\n') }
}

export function formatExpenseShare(
  expense: Expense,
  areaName?: string,
): { title: string; text: string } {
  const isIncome = expense.amount < 0
  const title = sentenceCase(expense.description)
  const lines = [
    isIncome ? '💰 Entrata — Note Personali' : '💸 Spesa — Note Personali',
    '',
    title,
  ]
  appendLine(lines, 'Area', areaName)
  appendLine(
    lines,
    'Importo',
    isIncome
      ? `+${formatAmount(Math.abs(expense.amount))}`
      : formatAmount(expense.amount),
  )
  appendLine(lines, 'Data', formatIsoDate(expense.date))
  appendLine(lines, 'Categoria', sentenceCase(expense.category))
  appendLine(
    lines,
    'Pagamento',
    METHOD_LABELS[(expense.paymentMethod ?? 'altro') as PaymentMethod],
  )
  return { title, text: lines.join('\n') }
}

export async function shareContent(payload: {
  title: string
  text: string
}): Promise<void> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
      })
      return
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    }
  }

  try {
    await navigator.clipboard.writeText(payload.text)
    alert('Testo copiato. Incollalo in WhatsApp, email o altro.')
  } catch {
    alert('Condivisione non disponibile. Prova da un altro browser o dispositivo.')
  }
}

export function shareNote(note: Note, areaName?: string) {
  return shareContent(formatNoteShare(note, areaName))
}

export function shareEvent(event: Event, areaName?: string) {
  return shareContent(formatEventShare(event, areaName))
}

export function shareExpense(expense: Expense, areaName?: string) {
  return shareContent(formatExpenseShare(expense, areaName))
}

function formatNoteLine(note: Note, areaName?: string): string {
  const parts = [sentenceCase(note.title)]
  if (areaName) parts.push(areaName)
  const period = formatDateRange(note.startDate, note.endDate)
  if (period) parts.push(period)
  const preview = note.content?.trim()
  if (preview) {
    const short = sentenceCase(preview).replace(/\s+/g, ' ')
    parts.push(short.length > 60 ? `${short.slice(0, 60)}…` : short)
  }
  return `• ${parts.join(' · ')}`
}

function formatEventLine(event: Event, areaName?: string): string {
  const parts = [sentenceCase(event.title)]
  if (areaName) parts.push(areaName)
  if (event.renewalDate) {
    parts.push(`rinnovo ${formatIsoDate(event.renewalDate)}`)
  } else if (event.endDate) {
    parts.push(`${formatIsoDate(event.startDate)} – ${formatIsoDate(event.endDate)}`)
  }
  if (event.cost != null && event.cost > 0) {
    const freq = recurrenceShort(event.recurrenceFrequency)
    parts.push(freq ? `${formatAmount(event.cost)}/${freq}` : formatAmount(event.cost))
  }
  return `• ${parts.join(' · ')}`
}

function formatExpenseLine(expense: Expense, areaName?: string): string {
  const isIncome = expense.amount < 0
  const parts = [sentenceCase(expense.description)]
  if (areaName) parts.push(areaName)
  parts.push(
    isIncome
      ? `+${formatAmount(Math.abs(expense.amount))}`
      : formatAmount(expense.amount),
  )
  parts.push(formatIsoDate(expense.date))
  parts.push(sentenceCase(expense.category))
  return `• ${parts.join(' · ')}`
}

export function formatSectionShare(
  sectionTitle: string,
  itemLines: string[],
  options?: { context?: string; footer?: string },
): { title: string; text: string } {
  const title = sentenceCase(sectionTitle)
  const lines = [`${title} — Note Personali`]
  if (options?.context) lines.push(options.context)
  lines.push('')
  if (itemLines.length === 0) {
    lines.push('(nessun elemento)')
  } else {
    lines.push(...itemLines)
  }
  if (options?.footer) {
    lines.push('', options.footer)
  }
  return { title, text: lines.join('\n') }
}

export function shareNotesSection(
  notes: Note[],
  options?: { areaName?: string; sectionTitle?: string },
) {
  const sectionTitle = options?.sectionTitle ?? 'Note'
  const lines = notes.map((n) => formatNoteLine(n, options?.areaName))
  return shareContent(
    formatSectionShare(sectionTitle, lines, {
      context: options?.areaName ? `Area: ${options.areaName}` : undefined,
    }),
  )
}

export function shareEventsSection(
  events: Event[],
  options?: {
    areaName?: string
    resolveArea?: (event: Event) => string | undefined
    sectionTitle?: string
    context?: string
    footer?: string
  },
) {
  const sectionTitle = options?.sectionTitle ?? 'Impegni'
  const lines = events.map((e) =>
    formatEventLine(
      e,
      options?.areaName ?? options?.resolveArea?.(e),
    ),
  )
  return shareContent(
    formatSectionShare(sectionTitle, lines, {
      context: options?.context,
      footer: options?.footer,
    }),
  )
}

export function shareImpegnoRowsSection(
  rows: Array<
    | { kind: 'event'; item: Event }
    | { kind: 'note'; item: Note }
  >,
  resolveArea: (areaId?: number) => string | undefined,
  options?: { sectionTitle?: string; footer?: string; hideArea?: boolean },
) {
  const sectionTitle = options?.sectionTitle ?? 'Impegni'
  const lines = rows.map((row) => {
    const area = options?.hideArea ? undefined : resolveArea(row.item.areaId)
    return row.kind === 'event'
      ? formatEventLine(row.item, area)
      : formatNoteLine(row.item, area)
  })
  return shareContent(
    formatSectionShare(sectionTitle, lines, { footer: options?.footer }),
  )
}

export function shareExpensesSection(
  expenses: Expense[],
  options?: {
    areaName?: string
    sectionTitle?: string
    monthLabel?: string
    footer?: string
  },
) {
  const sectionTitle = options?.sectionTitle ?? 'Spese'
  const lines = expenses.map((e) => formatExpenseLine(e, options?.areaName))
  const context = [options?.monthLabel, options?.areaName ? `Area: ${options.areaName}` : null]
    .filter(Boolean)
    .join(' · ')
  return shareContent(
    formatSectionShare(sectionTitle, lines, {
      context: context || undefined,
      footer: options?.footer,
    }),
  )
}

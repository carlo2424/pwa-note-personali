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

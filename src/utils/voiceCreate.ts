import { PRESET_LABELS } from '../constants/events'
import { db, type Event, type Expense, type Note } from '../db'
import { resolveAreaId } from './areas'
import { todayIso } from './countdown'
import { sentenceCase } from './format'
import { syncExpensesForEvent } from './eventExpenses'
import { defaultNoteIcon } from './noteIcon'
import { syncChecklistForNote, buildChecklistContent, parseVoiceChecklistItems } from './noteTasks'
import type { VoiceCreateCommand, VoiceCreateKind } from './parseVoiceCreateCommand'

export interface VoiceCreateResult {
  kind: VoiceCreateKind
  id: number
  title: string
  needsReview?: boolean
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeEventLabel(raw?: string): string | undefined {
  if (!raw) return undefined
  const t = raw.toLowerCase()
  for (const label of PRESET_LABELS) {
    if (t.includes(label.toLowerCase().replace('à', 'a'))) return label
  }
  return sentenceCase(raw)
}

export async function createFromVoiceCommand(
  cmd: VoiceCreateCommand,
): Promise<VoiceCreateResult> {
  const now = Date.now()
  const areaId = cmd.area ? await resolveAreaId(cmd.area) : undefined
  const title = sentenceCase(cmd.title)

  if (cmd.kind === 'note' || cmd.kind === 'checklist') {
    const kind = cmd.kind === 'note' ? 'text' : 'checklist'
    let noteTitle = title
    let content =
      kind === 'checklist'
        ? buildChecklistContent(
            cmd.checklistItems?.join('\n') ?? cmd.content ?? cmd.title,
          )
        : sentenceCase(cmd.content ?? '')

    if (kind === 'checklist') {
      const items = parseVoiceChecklistItems(content)
      if (
        items.length >= 2 &&
        noteTitle.toLowerCase() === 'lista' &&
        ['spesa', 'compere', 'elenco'].includes(items[0].toLowerCase())
      ) {
        noteTitle = sentenceCase(items[0])
      }
    }

    const id = await db.notes.add({
      title: noteTitle,
      content,
      kind,
      color: 'indigo',
      icon: defaultNoteIcon(kind),
      startDate: cmd.startDate,
      endDate: cmd.endDate,
      areaId,
      createdAt: now,
      updatedAt: now,
    })

    if (id === undefined) throw new Error('Impossibile creare la nota')

    if (kind === 'checklist') {
      await syncChecklistForNote(id, content, 'checklist')
    }

    return { kind: cmd.kind, id, title: noteTitle }
  }

  if (cmd.kind === 'expense') {
    const amount = cmd.amount ?? 1
    const id = await db.expenses.add({
      description: title,
      amount,
      category: cmd.category ?? 'Altro',
      date: cmd.startDate ?? todayIso(),
      paymentMethod: 'carta',
      areaId,
      createdAt: now,
    })

    if (id === undefined) throw new Error('Impossibile creare la spesa')

    return {
      kind: 'expense',
      id,
      title,
      needsReview: cmd.amount == null,
    }
  }

  const startDate = cmd.startDate ?? todayIso()
  const endDate = cmd.endDate ?? addDaysIso(startDate, 30)
  const labels = cmd.labels?.length
    ? cmd.labels.map(sentenceCase)
    : cmd.category
      ? [normalizeEventLabel(cmd.category)!].filter(Boolean)
      : []

  const data: Omit<Event, 'id'> = {
    title,
    writtenNote: sentenceCase(cmd.content ?? ''),
    labels,
    startDate,
    endDate,
    renewalDate: cmd.renewalDate ?? cmd.endDate,
    recurrenceFrequency: cmd.cost != null ? 'monthly' : undefined,
    color: 'indigo',
    icon: 'Calendar',
    cost: cmd.cost,
    paymentMethod: 'carta',
    areaId,
    createdAt: now,
    updatedAt: now,
  }

  const id = await db.events.add(data)
  if (id === undefined) throw new Error('Impossibile creare l\'impegno')

  await syncExpensesForEvent(id, data)

  return { kind: 'event', id, title }
}

export async function loadVoiceCreatedItem(
  result: VoiceCreateResult,
): Promise<Note | Event | Expense | undefined> {
  if (result.kind === 'note' || result.kind === 'checklist') {
    return db.notes.get(result.id)
  }
  if (result.kind === 'event') return db.events.get(result.id)
  return db.expenses.get(result.id)
}

export function voiceCreateKindLabel(kind: VoiceCreateKind): string {
  if (kind === 'checklist') return 'Lista'
  if (kind === 'event') return 'Impegno'
  if (kind === 'expense') return 'Spesa'
  return 'Nota'
}

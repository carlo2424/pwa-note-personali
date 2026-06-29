import { db } from '../db'
import type { Event, Note } from '../db'
import { sentenceCase } from './format'
import { filterEventImpegni, filterNoteImpegni, filterPlainNotes } from './impegno'

/** Trova o crea un'area dal nome digitato (case-insensitive) */
export async function resolveAreaId(
  areaName: string,
  groupName?: string,
): Promise<number | undefined> {
  const trimmed = areaName.trim()
  if (!trimmed) return undefined

  const normalized = sentenceCase(trimmed)
  const normalizedGroup = groupName?.trim()
    ? sentenceCase(groupName.trim())
    : undefined
  const existing = await db.areas.toArray()
  const found = existing.find(
    (a) => a.name.toLowerCase() === normalized.toLowerCase(),
  )
  if (found?.id) {
    if (normalizedGroup && found.groupName !== normalizedGroup) {
      await db.areas.update(found.id, { groupName: normalizedGroup })
    }
    return found.id
  }

  return db.areas.add({
    name: normalized,
    groupName: normalizedGroup,
    createdAt: Date.now(),
  })
}

export async function setAreaGroupName(
  areaId: number,
  groupName: string,
): Promise<void> {
  const trimmed = groupName.trim()
  await db.areas.update(areaId, {
    groupName: trimmed ? sentenceCase(trimmed) : undefined,
  })
}

export async function countItemsLinkedToArea(areaId: number): Promise<number> {
  const [noteCount, eventCount, expenseCount] = await Promise.all([
    db.notes.where('areaId').equals(areaId).count(),
    db.events.where('areaId').equals(areaId).count(),
    db.expenses.where('areaId').equals(areaId).count(),
  ])
  return noteCount + eventCount + expenseCount
}

export async function updateArea(
  areaId: number,
  fields: { name: string; groupName?: string },
): Promise<void> {
  const trimmed = fields.name.trim()
  if (!trimmed) return

  const normalized = sentenceCase(trimmed)
  const existing = await db.areas.toArray()
  const duplicate = existing.find(
    (a) => a.id !== areaId && a.name.toLowerCase() === normalized.toLowerCase(),
  )
  if (duplicate) {
    throw new Error('Esiste già un\'area con questo nome.')
  }

  const groupTrimmed = fields.groupName?.trim()
  await db.areas.update(areaId, {
    name: normalized,
    groupName: groupTrimmed ? sentenceCase(groupTrimmed) : undefined,
  })
}

/** Elimina l'area; le voci collegate restano senza area. */
export async function deleteArea(areaId: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.notes, db.events, db.expenses, db.areas],
    async () => {
      await db.notes.where('areaId').equals(areaId).modify({ areaId: undefined })
      await db.events.where('areaId').equals(areaId).modify({ areaId: undefined })
      await db.expenses
        .where('areaId')
        .equals(areaId)
        .modify({ areaId: undefined })
      await db.areas.delete(areaId)
    },
  )
}

export function matchesArea<T extends { areaId?: number }>(
  item: T,
  selectedAreaId: number | null,
): boolean {
  if (selectedAreaId === null) return true
  return item.areaId === selectedAreaId
}

export function areaNameById(
  areas: { id?: number; name: string }[],
  areaId?: number,
): string | undefined {
  if (!areaId) return undefined
  const name = areas.find((a) => a.id === areaId)?.name
  return name ? sentenceCase(name) : undefined
}

/** Etichetta area in Home: gruppo (es. Famiglia) o nome area (es. Budget) */
export function areaHomeLabel(
  areas: { id?: number; name: string; groupName?: string }[],
  areaId?: number,
): { title?: string; member?: string } {
  if (!areaId) return {}
  const area = areas.find((a) => a.id === areaId)
  if (!area) return {}
  if (area.groupName?.trim()) {
    return {
      title: sentenceCase(area.groupName),
      member: sentenceCase(area.name),
    }
  }
  return { title: sentenceCase(area.name) }
}

/** Elementi distinti per area (senza doppi conteggi spesa↔impegno) */
export function countDistinctAreaItems(
  notes: Pick<Note, 'areaId' | 'startDate' | 'endDate'>[],
  events: Pick<Event, 'areaId' | 'startDate' | 'endDate'>[],
  expenses: { areaId?: number; eventId?: number }[],
  areaId?: number,
): number {
  const plainNotes = filterPlainNotes(notes)
  const noteImpegni = filterNoteImpegni(notes)
  const eventImpegni = filterEventImpegni(events)
  const match = <T extends { areaId?: number }>(items: T[]) =>
    areaId == null
      ? items.length
      : items.filter((x) => x.areaId === areaId).length

  const standaloneExpenses = expenses.filter((e) => !e.eventId)

  return (
    match(plainNotes) +
    match(noteImpegni) +
    match(eventImpegni) +
    (areaId == null
      ? standaloneExpenses.length
      : standaloneExpenses.filter((e) => e.areaId === areaId).length)
  )
}

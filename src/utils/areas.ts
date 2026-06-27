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

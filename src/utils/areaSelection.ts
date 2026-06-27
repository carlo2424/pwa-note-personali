import type { Area } from '../db'
import { areaNameById } from './areas'
import { sentenceCase } from './format'

export type AreaSelection =
  | { kind: 'all' }
  | { kind: 'area'; areaId: number }
  | { kind: 'group'; groupName: string }

export function isAreaFilterActive(selection: AreaSelection): boolean {
  return selection.kind !== 'all'
}

export function matchesAreaSelection(
  item: { areaId?: number },
  selection: AreaSelection,
  areas: Area[],
): boolean {
  if (selection.kind === 'all') return true
  if (selection.kind === 'area') return item.areaId === selection.areaId
  const area = areas.find((a) => a.id === item.areaId)
  if (!area?.groupName) return false
  return (
    area.groupName.toLowerCase() === selection.groupName.toLowerCase()
  )
}

export function selectionLabel(
  selection: AreaSelection,
  areas: Area[],
): string | null {
  if (selection.kind === 'all') return null
  if (selection.kind === 'area') {
    return areaNameById(areas, selection.areaId) ?? null
  }
  return sentenceCase(selection.groupName)
}

export function isGroupSelected(
  selection: AreaSelection,
  groupName: string,
): boolean {
  return (
    selection.kind === 'group' &&
    selection.groupName.toLowerCase() === groupName.toLowerCase()
  )
}

export function isAreaInSelectedGroup(
  selection: AreaSelection,
  area: Pick<Area, 'id' | 'groupName'>,
): boolean {
  if (selection.kind === 'area') return selection.areaId === area.id
  if (selection.kind === 'group' && area.groupName) {
    return (
      area.groupName.toLowerCase() === selection.groupName.toLowerCase()
    )
  }
  return false
}

import type { Area } from '../db'
import { sentenceCase } from './format'

export interface AreaGroupChip {
  name: string
  areas: Area[]
  /** Numero di persone/aree nel gruppo */
  memberCount: number
}

export function normalizeGroupName(name: string): string {
  return sentenceCase(name.trim())
}

export function groupNamesFromAreas(areas: Area[]): string[] {
  const names = new Set<string>()
  for (const area of areas) {
    if (area.groupName?.trim()) {
      names.add(normalizeGroupName(area.groupName))
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'it'))
}

export function buildAreaChipLayout(
  areas: Area[],
): {
  standalone: Area[]
  groups: AreaGroupChip[]
} {
  const standalone: Area[] = []
  const groupMap = new Map<string, Area[]>()

  for (const area of areas) {
    if (!area.id) continue
    const group = area.groupName?.trim()
    if (!group) {
      standalone.push(area)
      continue
    }
    const key = normalizeGroupName(group)
    const list = groupMap.get(key) ?? []
    list.push(area)
    groupMap.set(key, list)
  }

  const groups = [...groupMap.entries()]
    .map(([name, members]) => ({
      name,
      areas: members.sort((a, b) => a.name.localeCompare(b.name, 'it')),
      memberCount: members.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))

  standalone.sort((a, b) => a.name.localeCompare(b.name, 'it'))

  return { standalone, groups }
}

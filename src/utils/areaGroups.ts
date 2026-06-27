import type { Area } from '../db'
import { sentenceCase } from './format'

export interface AreaGroupChip {
  name: string
  areas: Area[]
  totalCount: number
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
  counts: Map<number, number>,
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
      totalCount: members.reduce(
        (sum, area) => sum + (counts.get(area.id!) ?? 0),
        0,
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))

  standalone.sort((a, b) => a.name.localeCompare(b.name, 'it'))

  return { standalone, groups }
}

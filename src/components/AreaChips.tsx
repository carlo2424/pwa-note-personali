import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { type Area } from '../db'
import { resolveAreaId } from '../utils/areas'
import {
  buildAreaChipLayout,
  groupNamesFromAreas,
  normalizeGroupName,
} from '../utils/areaGroups'
import {
  type AreaSelection,
  isGroupSelected,
} from '../utils/areaSelection'
import { sentenceCase } from '../utils/format'

interface AreaChipsProps {
  areas: Area[]
  selection: AreaSelection
  onSelect: (selection: AreaSelection) => void
  counts: Map<number, number>
  totalCount: number
  headerTrailing?: ReactNode
}

export function AreaChips({
  areas,
  selection,
  onSelect,
  counts,
  totalCount,
  headerTrailing,
}: AreaChipsProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const chipBase =
    'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-[0.98]'

  const { standalone, groups } = useMemo(
    () => buildAreaChipLayout(areas, counts),
    [areas, counts],
  )

  const existingGroups = useMemo(() => groupNamesFromAreas(areas), [areas])

  const activeExpandedGroup =
    expandedGroup ??
    (selection.kind === 'group'
      ? selection.groupName
      : selection.kind === 'area'
        ? (() => {
            const area = areas.find((a) => a.id === selection.areaId)
            return area?.groupName
              ? normalizeGroupName(area.groupName)
              : null
          })()
        : null)

  async function submitArea() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const areaId = await resolveAreaId(trimmed, groupName || undefined)
      if (areaId === undefined) return
      setName('')
      setGroupName('')
      setAdding(false)
      onSelect({ kind: 'area', areaId })
      if (groupName.trim()) {
        setExpandedGroup(normalizeGroupName(groupName))
      }
    } catch {
      alert('Impossibile creare l\'area. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  function cancelAdd() {
    setName('')
    setGroupName('')
    setAdding(false)
  }

  function selectGroup(group: string) {
    const normalized = normalizeGroupName(group)
    setExpandedGroup(normalized)
    onSelect({ kind: 'group', groupName: normalized })
  }

  function countBadge(count: number, active: boolean) {
    if (count <= 0) return null
    return (
      <span
        className={`rounded-full px-1.5 py-px text-xs tabular-nums ${
          active
            ? 'bg-indigo-500/50 text-indigo-50'
            : 'bg-white/80 text-slate-500'
        }`}
      >
        {count}
      </span>
    )
  }

  return (
    <div className="mb-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Aree
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {headerTrailing}
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="Nuova area"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {adding && (
        <form
          className="mb-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submitArea()
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => setName(sentenceCase(e.target.value))}
            placeholder="Nome area (es. Lorenzo)"
            autoFocus
            disabled={saving}
            className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onBlur={(e) => setGroupName(sentenceCase(e.target.value))}
            placeholder="Gruppo opzionale (es. Famiglia)"
            disabled={saving}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {existingGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {existingGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  disabled={saving}
                  onClick={() => setGroupName(group)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    normalizeGroupName(groupName) === group
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Salva
            </button>
            <button
              type="button"
              onClick={cancelAdd}
              disabled={saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              aria-label="Annulla"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filtra per area"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selection.kind === 'all'}
          onClick={() => {
            setExpandedGroup(null)
            onSelect({ kind: 'all' })
          }}
          className={`${chipBase} ${
            selection.kind === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>Tutte</span>
          {countBadge(totalCount, selection.kind === 'all')}
        </button>

        {standalone.map((area) => {
          if (!area.id) return null
          const count = counts.get(area.id) ?? 0
          const active =
            selection.kind === 'area' && selection.areaId === area.id
          return (
            <button
              key={area.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setExpandedGroup(null)
                onSelect({ kind: 'area', areaId: area.id! })
              }}
              className={`${chipBase} ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{area.name}</span>
              {countBadge(count, active)}
            </button>
          )
        })}

        {groups.map((group) => {
          const active = isGroupSelected(selection, group.name)
          const expanded = activeExpandedGroup === group.name
          return (
            <button
              key={group.name}
              type="button"
              role="tab"
              aria-selected={active || expanded}
              onClick={() => selectGroup(group.name)}
              className={`${chipBase} ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : expanded
                    ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{group.name}</span>
              {countBadge(group.totalCount, active)}
              <ChevronDown
                className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          )
        })}
      </div>

      {activeExpandedGroup && (
        <div className="mt-1.5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups
            .find((g) => g.name === activeExpandedGroup)
            ?.areas.map((area) => {
              if (!area.id) return null
              const count = counts.get(area.id) ?? 0
              const active =
                selection.kind === 'area' && selection.areaId === area.id
              const inGroup =
                selection.kind === 'group' &&
                isGroupSelected(selection, activeExpandedGroup)
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() =>
                    onSelect({ kind: 'area', areaId: area.id! })
                  }
                  className={`${chipBase} text-xs ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : inGroup
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}
                >
                  <span>{area.name}</span>
                  {countBadge(count, active)}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

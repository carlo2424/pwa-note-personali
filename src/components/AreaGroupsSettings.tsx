import { Layers } from 'lucide-react'
import { useState } from 'react'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { setAreaGroupName } from '../utils/areas'
import { groupNamesFromAreas, normalizeGroupName } from '../utils/areaGroups'
import { sentenceCase } from '../utils/format'

export function AreaGroupsSettings() {
  const areas = useDexieLiveQuery(() => db.areas.orderBy('name').toArray())
  const [savingId, setSavingId] = useState<number | null>(null)

  const existingGroups = groupNamesFromAreas(areas ?? [])

  async function saveGroup(areaId: number, value: string) {
    setSavingId(areaId)
    try {
      await setAreaGroupName(areaId, value)
    } finally {
      setSavingId(null)
    }
  }

  if (!areas?.length) {
    return (
      <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Nessuna area ancora. Creane una dalla Home.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Gruppi aree
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            In Home vedi un chip per gruppo (es. Famiglia) e, espandendo, i
            singoli nomi.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {areas.map((area) => {
          if (!area.id) return null
          return (
            <li
              key={area.id}
              className="rounded-xl border border-slate-100 bg-white p-3"
            >
              <p className="text-sm font-medium text-slate-800">{area.name}</p>
              <label className="mt-2 block text-xs text-slate-500">
                Gruppo
              </label>
              <input
                type="text"
                defaultValue={area.groupName ?? ''}
                disabled={savingId === area.id}
                placeholder="Es. Famiglia, Casa…"
                onBlur={(e) => {
                  const next = sentenceCase(e.target.value)
                  if (next !== (area.groupName ?? '')) {
                    void saveGroup(area.id!, e.target.value)
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {existingGroups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {existingGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      disabled={savingId === area.id}
                      onClick={() => void saveGroup(area.id!, group)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        normalizeGroupName(area.groupName ?? '') === group
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

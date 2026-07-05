import { useMemo, useState } from 'react'
import { db, type Event, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { areaNameById } from '../utils/areas'
import { filterEventImpegni, filterNoteImpegni } from '../utils/impegno'
import { EventExpandableRow } from './EventExpandableRow'
import { NoteExpandableRow } from './NoteExpandableRow'
import { SearchBar } from './SearchBar'

interface EventListProps {
  onEdit: (event: Event) => void
  onEditNote: (note: Note) => void
}

type ImpegnoRow =
  | { kind: 'event'; item: Event; sortKey: string }
  | { kind: 'note'; item: Note; sortKey: string }

export function EventList({ onEdit, onEditNote }: EventListProps) {
  const [search, setSearch] = useState('')

  const events = useDexieLiveQuery(
    () => db.events.orderBy('updatedAt').reverse().toArray(),
  )
  const notes = useDexieLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
  )
  const tasks = useDexieLiveQuery(() => db.tasks.toArray())
  const areas = useDexieLiveQuery(() => db.areas.toArray())

  const todoByEvent = useMemo(() => {
    const map = new Map<number, number>()
    for (const t of tasks ?? []) {
      if (!t.done && t.eventId) {
        map.set(t.eventId, (map.get(t.eventId) ?? 0) + 1)
      }
    }
    return map
  }, [tasks])

  const impegnoRows = useMemo((): ImpegnoRow[] => {
    const eventRows = filterEventImpegni(events ?? []).map((item) => ({
      kind: 'event' as const,
      item,
      sortKey: item.startDate,
    }))
    const noteRows = filterNoteImpegni(notes ?? []).map((item) => ({
      kind: 'note' as const,
      item,
      sortKey: item.startDate!,
    }))
    return [...eventRows, ...noteRows].sort((a, b) =>
      b.sortKey.localeCompare(a.sortKey),
    )
  }, [events, notes])

  const query = search.trim().toLowerCase()
  const filtered = impegnoRows.filter((row) => {
    if (!query) return true
    if (row.kind === 'event') {
      const e = row.item
      return (
        e.title.toLowerCase().includes(query) ||
        e.labels.some((l) => l.toLowerCase().includes(query)) ||
        e.writtenNote.toLowerCase().includes(query)
      )
    }
    const n = row.item
    return (
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    )
  })

  if (events === undefined || notes === undefined) {
    return <p className="py-8 text-center text-sm text-slate-400">Caricamento...</p>
  }

  if (impegnoRows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">Nessun impegno</p>
        <p className="mt-1 text-xs text-slate-400">
          Un impegno ha <span className="font-medium">data inizio e data fine</span>.
          Puoi crearlo dalla tab Impegni o impostando entrambe le date su una nota
          (es. wifi dal 27/6 al 27/7). Per pagamenti una tantum usa{' '}
          <span className="font-medium">Spesa</span>.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cerca impegni..."
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Nessun risultato per &ldquo;{search}&rdquo;
        </p>
      ) : (
        <ul className="space-y-2 pb-4">
          {filtered.map((row) => {
            if (row.kind === 'event') {
              const event = row.item
              const todoCount = event.id ? (todoByEvent.get(event.id) ?? 0) : 0
              return (
                <li key={`e-${event.id}`}>
                  <EventExpandableRow
                    event={event}
                    todoCount={todoCount}
                    areaName={areaNameById(areas ?? [], event.areaId)}
                    onEdit={() => onEdit(event)}
                  />
                </li>
              )
            }
            const note = row.item
            return (
              <li key={`n-${note.id}`}>
                <NoteExpandableRow
                  note={note}
                  areaName={areaNameById(areas ?? [], note.areaId)}
                  onEdit={() => onEditNote(note)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

import { useState } from 'react'
import { db, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { areaNameById } from '../utils/areas'
import { filterPlainNotes } from '../utils/impegno'
import { isNoteChecklist, isPlainTextNote } from '../utils/noteKind'
import { NoteExpandableRow } from './NoteExpandableRow'

type NoteFilter = 'all' | 'text' | 'checklist'

interface NoteListProps {
  onEdit: (note: Note) => void
}

export function NoteList({ onEdit }: NoteListProps) {
  const [filter, setFilter] = useState<NoteFilter>('all')
  const notes = useDexieLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
  )
  const areas = useDexieLiveQuery(() => db.areas.toArray())

  const plainNotes = filterPlainNotes(notes ?? [])
  const filtered = plainNotes.filter((note) => {
    if (filter === 'text') return isPlainTextNote(note)
    if (filter === 'checklist') return isNoteChecklist(note)
    return true
  })

  const textCount = plainNotes.filter((n) => isPlainTextNote(n)).length
  const checklistCount = plainNotes.filter((n) => isNoteChecklist(n)).length

  const chipBase =
    'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-[0.98]'

  if (notes === undefined) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">Caricamento...</p>
    )
  }

  if (plainNotes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">Nessuna nota o lista</p>
        <p className="mt-1 text-xs text-slate-400">
          Tocca <span className="font-medium">+</span> per una nota testuale o una
          lista to-do. Con date inizio e fine compaiono anche in{' '}
          <span className="font-medium">Impegni</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`${chipBase} ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          Tutte · {plainNotes.length}
        </button>
        <button
          type="button"
          onClick={() => setFilter('text')}
          className={`${chipBase} ${
            filter === 'text'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          Note · {textCount}
        </button>
        <button
          type="button"
          onClick={() => setFilter('checklist')}
          className={`${chipBase} ${
            filter === 'checklist'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          Liste · {checklistCount}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Nessun elemento in questa categoria.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((note) => (
            <li key={note.id}>
              <NoteExpandableRow
                note={note}
                areaName={areaNameById(areas ?? [], note.areaId)}
                onEdit={() => onEdit(note)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

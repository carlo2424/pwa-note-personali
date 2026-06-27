import { db, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { areaNameById } from '../utils/areas'
import { filterPlainNotes } from '../utils/impegno'
import { NoteExpandableRow } from './NoteExpandableRow'

interface NoteListProps {
  onEdit: (note: Note) => void
}

export function NoteList({ onEdit }: NoteListProps) {
  const notes = useDexieLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
  )
  const areas = useDexieLiveQuery(() => db.areas.toArray())

  const plainNotes = filterPlainNotes(notes ?? [])

  if (notes === undefined) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">Caricamento...</p>
    )
  }

  if (plainNotes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">Nessuna nota</p>
        <p className="mt-1 text-xs text-slate-400">
          Note con data inizio e fine compaiono in{' '}
          <span className="font-medium">Impegni</span>. Tocca{' '}
          <span className="font-medium">+</span> per un appunto senza periodo.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {plainNotes.map((note) => (
        <li key={note.id}>
          <NoteExpandableRow
            note={note}
            areaName={areaNameById(areas ?? [], note.areaId)}
            onEdit={() => onEdit(note)}
          />
        </li>
      ))}
    </ul>
  )
}

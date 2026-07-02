import { db } from '../db'
import { useDexieLiveQuery } from './useDexieLiveQuery'
import {
  filterEventImpegni,
  filterNoteImpegni,
  filterPlainNotes,
} from '../utils/impegno'

export type NavSectionCounts = {
  home: number
  notes: number
  events: number
  expenses: number
  archive: number
}

const EMPTY: NavSectionCounts = {
  home: 0,
  notes: 0,
  events: 0,
  expenses: 0,
  archive: 0,
}

export async function computeNavSectionCounts(): Promise<NavSectionCounts> {
  const [notes, events, expenses, archive] = await Promise.all([
    db.notes.toArray(),
    db.events.toArray(),
    db.expenses.toArray(),
    db.archive.count(),
  ])

  const plainNotes = filterPlainNotes(notes)
  const eventImpegni = filterEventImpegni(events)
  const noteImpegni = filterNoteImpegni(notes)
  const eventCount = eventImpegni.length + noteImpegni.length

  return {
    notes: plainNotes.length,
    events: eventCount,
    expenses: expenses.length,
    archive,
    home: plainNotes.length + eventCount + expenses.length,
  }
}

export function useNavSectionCounts(): NavSectionCounts {
  const counts = useDexieLiveQuery(() => computeNavSectionCounts())
  return counts ?? EMPTY
}

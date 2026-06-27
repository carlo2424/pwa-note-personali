import type { Note } from '../db'
import { isNoteChecklistContent } from './noteTasks'

export type NoteKind = 'text' | 'checklist'

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  text: 'Nota',
  checklist: 'Lista',
}

/** Tipo effettivo (campo salvato o euristica sui dati vecchi) */
export function resolveNoteKind(
  note: Pick<Note, 'kind' | 'content'>,
): NoteKind {
  if (note.kind === 'checklist' || note.kind === 'text') return note.kind
  return isNoteChecklistContent(note.content ?? '') ? 'checklist' : 'text'
}

export function isNoteChecklist(
  note: Pick<Note, 'kind' | 'content'>,
): boolean {
  return resolveNoteKind(note) === 'checklist'
}

export function isPlainTextNote(
  note: Pick<Note, 'kind' | 'content'>,
): boolean {
  return resolveNoteKind(note) === 'text'
}

import type { NoteKind } from './noteKind'

export function defaultNoteIcon(kind: NoteKind): string {
  return kind === 'checklist' ? 'ListChecks' : 'StickyNote'
}

export function resolveNoteIcon(
  note: { icon?: string; kind?: NoteKind; content?: string },
  kind: NoteKind,
): string {
  if (note.icon?.trim()) return note.icon.trim()
  return defaultNoteIcon(kind)
}

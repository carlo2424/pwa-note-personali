import { db } from '../db'
import { sentenceCase } from './format'
import { parseTaskLines } from './eventTasks'

/** Una riga = una voce; servono almeno 2 righe per attivare la lista con spunte */
export const MIN_CHECKLIST_LINES = 2

export function isNoteChecklistContent(content: string): boolean {
  return parseTaskLines(content).length >= MIN_CHECKLIST_LINES
}

const CHECKLIST_ITEM_NOISE = new Set([
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'un',
  'una',
  'uno',
  'e',
  'di',
  'del',
  'della',
  'dei',
  'delle',
  'in',
  'su',
  'a',
  'al',
  'alla',
])

/** Interpreta voci lista dettate a voce (virgole, «e», spazi tra parole) */
export function parseVoiceChecklistItems(raw: string): string[] {
  const normalized = raw.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  let parts = normalized
    .split(/\r?\n|[,;]|(?:\s+e\s+)/i)
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length === 1) {
    const words = parts[0].split(/\s+/).filter(Boolean)
    const looksLikeList =
      words.length >= 2 &&
      words.length <= 12 &&
      words.every((w) => w.length <= 18) &&
      !/\b(lasciare|ricordare|chiamare|portare|pagare|andare)\b/i.test(parts[0])
    if (looksLikeList) parts = words
  }

  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    const cleaned = part.trim()
    if (!cleaned || CHECKLIST_ITEM_NOISE.has(cleaned.toLowerCase())) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
  }
  return out
}

export function buildChecklistContent(raw: string): string {
  return parseVoiceChecklistItems(raw).join('\n')
}

export async function deleteTasksForNote(noteId: number): Promise<void> {
  const linked = await db.tasks.where('noteId').equals(noteId).toArray()
  for (const t of linked) {
    if (t.id) await db.tasks.delete(t.id)
  }
}

/** Sincronizza le voci checklist collegate a una nota (solo tipo lista) */
export async function syncChecklistForNote(
  noteId: number,
  content: string,
  kind: 'text' | 'checklist' = 'checklist',
): Promise<void> {
  if (kind !== 'checklist') {
    await deleteTasksForNote(noteId)
    return
  }

  const lines = parseTaskLines(content)
  if (lines.length < MIN_CHECKLIST_LINES) {
    await deleteTasksForNote(noteId)
    return
  }

  const existing = await db.tasks
    .where('noteId')
    .equals(noteId)
    .sortBy('createdAt')
  const now = Date.now()

  for (let i = 0; i < lines.length; i++) {
    const title = sentenceCase(lines[i])
    const prev = existing[i]
    if (prev?.id) {
      await db.tasks.update(prev.id, { title, noteId })
    } else {
      await db.tasks.add({
        title,
        done: false,
        noteId,
        createdAt: now,
      })
    }
  }

  for (let i = lines.length; i < existing.length; i++) {
    if (existing[i].id) await db.tasks.delete(existing[i].id)
  }
}

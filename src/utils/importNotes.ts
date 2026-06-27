import { db } from '../db'
import { resolveAreaId } from './areas'
import type { ImportedNoteDraft } from './fileImport'
import { sentenceCase } from './format'

export type ImportResult = {
  imported: number
  skipped: number
}

/** Salva le note importate nel database locale */
export async function saveImportedNotes(
  drafts: ImportedNoteDraft[],
): Promise<ImportResult> {
  const now = Date.now()
  let imported = 0
  let skipped = 0

  for (const draft of drafts) {
    const title = sentenceCase(draft.title.trim())
    if (!title) {
      skipped++
      continue
    }

    const areaId = draft.areaName
      ? await resolveAreaId(draft.areaName)
      : undefined

    await db.notes.add({
      title,
      content: sentenceCase(draft.content.trim()),
      color: 'indigo',
      startDate: draft.startDate,
      endDate: draft.endDate,
      areaId,
      createdAt: now,
      updatedAt: now,
    })
    imported++
  }

  return { imported, skipped }
}

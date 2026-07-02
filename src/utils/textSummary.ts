import { sentenceCase } from './format'

/** Prime parole significative di un testo (note, descrizioni, ecc.) */
export function summarizeText(
  text: string | null | undefined,
  maxLength = 72,
): string {
  const normalized = (text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' · ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return ''

  if (normalized.length <= maxLength) {
    return sentenceCase(normalized)
  }

  const cut = normalized.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  const snippet =
    lastSpace > maxLength * 0.45 ? cut.slice(0, lastSpace) : cut.trim()

  return `${sentenceCase(snippet.trim())}…`
}

/** Anteprima voci to-do non completate */
export function summarizeChecklistTasks(
  tasks: { title: string; done: boolean }[],
  maxLength = 72,
): string {
  const open = tasks.filter((t) => !t.done && t.title.trim())
  if (open.length === 0) {
    const done = tasks.filter((t) => t.title.trim())
    if (done.length === 0) return ''
    return summarizeText(
      done
        .slice(0, 3)
        .map((t) => t.title)
        .join(', '),
      maxLength,
    )
  }
  return summarizeText(
    open
      .slice(0, 3)
      .map((t) => t.title)
      .join(', '),
    maxLength,
  )
}

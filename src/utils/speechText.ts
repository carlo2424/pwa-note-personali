/** Unisce segmenti dettatura senza duplicare testo già riconosciuto */
export function appendSpeechSegment(base: string, segment: string): string {
  const b = base.trim()
  const s = segment.trim()
  if (!s) return b
  if (!b) return s
  if (b.toLowerCase() === s.toLowerCase()) return b
  if (b.toLowerCase().endsWith(s.toLowerCase())) return b
  if (s.toLowerCase().startsWith(b.toLowerCase())) return s
  return `${b} ${s}`.replace(/\s+/g, ' ').trim()
}

/** Aggiunge nuovo testo dettato al contenuto esistente (note / liste) */
export function mergeDictationIntoContent(
  previous: string,
  addition: string,
  multiline = false,
): string {
  const prev = previous.trim()
  const add = addition.trim()
  if (!add) return prev
  if (!prev) return add

  const merged = appendSpeechSegment(prev, add)
  if (merged.length > prev.length) return merged

  if (multiline) {
    return `${prev}\n${add}`
  }

  return appendSpeechSegment(prev, add)
}

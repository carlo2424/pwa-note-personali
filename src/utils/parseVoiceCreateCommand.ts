import { todayIso } from './countdown'
import { parseVoiceChecklistItems } from './noteTasks'

export type VoiceCreateKind = 'note' | 'checklist' | 'event' | 'expense'

export interface VoiceCreateCommand {
  kind: VoiceCreateKind
  title: string
  area?: string
  category?: string
  amount?: number
  cost?: number
  content?: string
  startDate?: string
  endDate?: string
  renewalDate?: string
  checklistItems?: string[]
  labels?: string[]
  rawTranscript: string
}

export interface VoiceParseResult {
  ok: true
  command: VoiceCreateCommand
}

export interface VoiceParseFailure {
  ok: false
  reason: string
  hint: string
}

const MONTHS: Record<string, number> = {
  gennaio: 0,
  febbraio: 1,
  marzo: 2,
  aprile: 3,
  maggio: 4,
  giugno: 5,
  luglio: 6,
  agosto: 7,
  settembre: 8,
  ottobre: 9,
  novembre: 10,
  dicembre: 11,
}

const KIND_RULES: { kind: VoiceCreateKind; words: string[]; weight: number }[] = [
  { kind: 'expense', words: ['spesa', 'spese', 'pagamento', 'pagare', 'acquisto', 'uscita'], weight: 4 },
  { kind: 'checklist', words: ['lista', 'checklist', 'elenco', 'to do', 'todo', 'compere'], weight: 3 },
  { kind: 'event', words: ['impegno', 'impegni', 'abbonamento', 'evento', 'scadenza', 'rinnovo'], weight: 2 },
  { kind: 'note', words: ['nota', 'note', 'appunto', 'appunti', 'promemoria', 'memo'], weight: 1 },
]

/** Campi etichettati: riconosciuti ovunque nel testo, in qualsiasi ordine */
const LABELED_FIELDS: { field: keyof ParsedFields; aliases: string[] }[] = [
  { field: 'title', aliases: ['titolo', 'nome', 'intitolata', 'intitolato', 'chiamata', 'chiamato', 'oggetto'] },
  { field: 'content', aliases: ['messaggio', 'contenuto', 'testo', 'descrizione', 'corpo', 'dettagli', 'appunto'] },
  { field: 'area', aliases: ['area', 'ambito'] },
  { field: 'category', aliases: ['categoria', 'cat', 'etichetta', 'label'] },
  { field: 'amountText', aliases: ['importo', 'spesa di', 'prezzo', 'pagato'] },
  { field: 'costText', aliases: ['costo', 'abbonamento di', 'canone'] },
  { field: 'endDateText', aliases: ['scadenza', 'data fine', 'entro il', 'entro', 'fino al', 'fino a', 'per il'] },
  { field: 'startDateText', aliases: ['data inizio', 'inizio', 'partendo dal', 'partendo da'] },
  { field: 'renewalDateText', aliases: ['rinnovo', 'prossimo addebito', 'addebito', 'prossimo pagamento'] },
  { field: 'listItemsText', aliases: ['elementi', 'voci', 'punti'] },
]

interface ParsedFields {
  title?: string
  content?: string
  area?: string
  category?: string
  amountText?: string
  costText?: string
  endDateText?: string
  startDateText?: string
  renewalDateText?: string
  listItemsText?: string
}

interface TextSpan {
  start: number
  end: number
}

interface MarkerMatch {
  field: keyof ParsedFields | 'kind'
  alias: string
  start: number
  valueStart: number
  valueEnd: number
  value: string
}

const NOISE_WORDS = new Set([
  'crea',
  'creare',
  'creo',
  'aggiungi',
  'aggiungere',
  'inserisci',
  'inserire',
  'nuova',
  'nuovo',
  'nuove',
  'nuovi',
  'una',
  'uno',
  'un',
  "un'",
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'per',
  'favore',
  'voce',
  'elemento',
  'qualcosa',
  'vorrei',
  'voglio',
  'metti',
  'mettere',
  'registra',
  'registrare',
  'con',
  'e',
  'poi',
  'anche',
])

function padIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return padIso(d.getFullYear(), d.getMonth(), d.getDate())
}

function normalizeTranscript(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\beuri\b/gi, 'euro')
    .replace(/\beur\b/gi, 'euro')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseItalianDateFragment(fragment: string): string | undefined {
  const t = fragment.toLowerCase().trim()
  if (!t) return undefined
  if (/\boggi\b/.test(t)) return todayIso()
  if (/\bdomani\b/.test(t)) return addDaysIso(todayIso(), 1)
  if (/\bdopodomani\b/.test(t)) return addDaysIso(todayIso(), 2)
  if (/\bfine mese\b/.test(t)) {
    const now = new Date()
    return padIso(now.getFullYear(), now.getMonth() + 1, 0)
  }

  const slash = t.match(/(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/)
  if (slash) {
    const day = parseInt(slash[1], 10)
    const month = parseInt(slash[2], 10) - 1
    let year = slash[3] ? parseInt(slash[3], 10) : new Date().getFullYear()
    if (year < 100) year += 2000
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return padIso(year, month, day)
    }
  }

  const named = t.match(
    /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?/,
  )
  if (named) {
    const day = parseInt(named[1], 10)
    const month = MONTHS[named[2]]
    const year = named[3] ? parseInt(named[3], 10) : new Date().getFullYear()
    return padIso(year, month, day)
  }

  const monthOnly = t.match(
    /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/,
  )
  if (monthOnly) {
    const month = MONTHS[monthOnly[1]]
    const year = new Date().getFullYear()
    return padIso(year, month, 1)
  }

  return undefined
}

function parseAmount(text: string): number | undefined {
  const patterns = [
    /(\d+(?:[.,]\d{1,2})?)\s*(?:euro|€)\b/i,
    /\b(?:euro|€)\s*(\d+(?:[.,]\d{1,2})?)/i,
    /\b(?:importo|costo|prezzo|spesa|pagare|canone)\s*(?:di\s*)?(\d+(?:[.,]\d{1,2})?)/i,
    /\b(\d+(?:[.,]\d{1,2})?)\b/,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (!m?.[1]) continue
    const n = parseFloat(m[1].replace(',', '.'))
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

function buildAllAliases(): { field: keyof ParsedFields | 'kind'; alias: string }[] {
  const out: { field: keyof ParsedFields | 'kind'; alias: string }[] = []
  for (const rule of KIND_RULES) {
    for (const word of rule.words) {
      out.push({ field: 'kind', alias: word })
    }
  }
  for (const def of LABELED_FIELDS) {
    for (const alias of def.aliases) {
      out.push({ field: def.field, alias })
    }
  }
  return out.sort((a, b) => b.alias.length - a.alias.length)
}

const ALL_ALIASES = buildAllAliases()

function findMarkers(text: string): MarkerMatch[] {
  const lower = text.toLowerCase()
  const hits: { field: keyof ParsedFields | 'kind'; alias: string; index: number }[] = []

  for (const { field, alias } of ALL_ALIASES) {
    const re = new RegExp(`(?:^|[\\s,;])${escapeRegExp(alias)}(?:\\s*[:=])?(?=\\s|$|[,;])`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(lower)) !== null) {
      const index = m.index + (m[0].startsWith(' ') || m[0].startsWith(',') || m[0].startsWith(';') ? 1 : 0)
      hits.push({ field, alias, index })
    }
  }

  hits.sort((a, b) => a.index - b.index || b.alias.length - a.alias.length)

  const used: MarkerMatch[] = []
  const occupied: TextSpan[] = []

  for (const hit of hits) {
    const spanStart = hit.index
    const spanEnd = spanStart + hit.alias.length
    if (occupied.some((s) => spanStart < s.end && spanEnd > s.start)) continue

    const next = hits.find((h) => h.index > spanEnd && !occupied.some((s) => h.index >= s.start && h.index < s.end))
    const valueEnd =
      hit.field === 'kind' ? spanEnd : next ? next.index : text.length
    let value =
      hit.field === 'kind' ? '' : text.slice(spanEnd, valueEnd).replace(/^[\s,:;=]+/, '').trim()
    value = value.replace(/[\s,;]+$/, '').trim()

    if (hit.field !== 'kind' && value.length === 0) continue

    used.push({
      field: hit.field,
      alias: hit.alias,
      start: spanStart,
      valueStart: spanEnd,
      valueEnd,
      value,
    })
    occupied.push({ start: spanStart, end: valueEnd })
  }

  return used
}

function detectKindFromCreatePhrase(text: string): VoiceCreateKind | undefined {
  const kindWords = KIND_RULES.flatMap((r) => r.words)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  const m = text.match(
    new RegExp(
      `(?:^|[\\s,;])(?:crea(?:re)?|aggiungi(?:ere)?|inserisci(?:ere)?|nuov[oa]|metti(?:ere)?|registra(?:re)?)\\s+(?:un[a]?|una|uno|un|l')?\\s*(${kindWords})\\b`,
      'i',
    ),
  )
  if (!m?.[1]) return undefined
  const word = m[1].toLowerCase()
  return KIND_RULES.find((r) => r.words.includes(word))?.kind
}

function detectKind(text: string, markers: MarkerMatch[]): VoiceCreateKind | undefined {
  const fromPhrase = detectKindFromCreatePhrase(text)
  if (fromPhrase) return fromPhrase

  const kindMarkers = markers.filter((m) => m.field === 'kind')
  if (kindMarkers.length > 0) {
    let best: { kind: VoiceCreateKind; score: number; index: number } | undefined
    for (const marker of kindMarkers) {
      const rule = KIND_RULES.find((r) => r.words.some((w) => w === marker.alias))
      if (!rule) continue
      const score = rule.weight * 10 - marker.start / 1000
      if (!best || score > best.score || (score === best.score && marker.start < best.index)) {
        best = { kind: rule.kind, score, index: marker.start }
      }
    }
    if (best) return best.kind
  }

  const lower = ` ${text.toLowerCase()} `
  let best: { kind: VoiceCreateKind; score: number; index: number } | undefined

  for (const rule of KIND_RULES) {
    for (const word of rule.words) {
      const idx = lower.indexOf(` ${word} `)
      if (idx === -1) continue
      const score = rule.weight * 10 - idx / 1000
      if (!best || score > best.score || (score === best.score && idx < best.index)) {
        best = { kind: rule.kind, score, index: idx }
      }
    }
  }

  return best?.kind
}

function inferKind(fields: ParsedFields, text: string): VoiceCreateKind {
  if (fields.listItemsText) return 'checklist'
  if (fields.amountText || /\b\d+(?:[.,]\d+)?\s*(?:euro|€)\b/i.test(text)) return 'expense'
  if (
    fields.endDateText ||
    fields.startDateText ||
    fields.renewalDateText ||
    fields.costText ||
    /\b(scadenza|rinnovo|abbonamento)\b/i.test(text)
  ) {
    return 'event'
  }
  if (/\b(lista|checklist|elenco)\b/i.test(text)) return 'checklist'
  return 'note'
}

function splitListItems(raw: string): string[] {
  return parseVoiceChecklistItems(raw)
}

function stripCreateCommandPrefix(text: string): string {
  const kindWords = KIND_RULES.flatMap((r) => r.words).join('|')
  return text
    .replace(
      new RegExp(
        `^(?:crea(?:re)?|aggiungi(?:ere)?|inserisci(?:ere)?|nuov[oa]|metti(?:ere)?|registra(?:re)?)\\s+(?:un[a]?|una|uno|un)?\\s*(?:${kindWords})\\s*[,;:]?\\s*`,
        'i',
      ),
      '',
    )
    .trim()
}

function collapseRepeatedWords(text: string): string {
  const words = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (const word of words) {
    const prev = out[out.length - 1]
    if (!prev || prev.toLowerCase() !== word.toLowerCase()) out.push(word)
  }
  return out.join(' ')
}

function makeNoteTitle(body: string): string {
  const words = body.split(/\s+/).filter(Boolean)
  if (words.length <= 6) return body
  return words.slice(0, 6).join(' ')
}

function cleanRemainder(raw: string): string {
  let t = raw
  t = t.replace(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:euro|€)\b/gi, ' ')
  t = t.replace(/\b(?:euro|€)\s*(\d+(?:[.,]\d{1,2})?)\b/gi, ' ')
  t = t.replace(
    /\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/gi,
    ' ',
  )
  t = t.replace(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/g, ' ')
  t = t.replace(/\b(oggi|domani|dopodomani|fine mese)\b/gi, ' ')
  for (const rule of KIND_RULES) {
    for (const word of rule.words) {
      t = t.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi'), ' ')
    }
  }
  const words = t
    .split(/\s+/)
    .map((w) => w.replace(/^[,;:]+|[,;:]+$/g, '').trim())
    .filter((w) => w.length > 0 && !NOISE_WORDS.has(w.toLowerCase()))
  return words.join(' ').trim()
}

function inferTitleAndContent(
  remainder: string,
  fields: ParsedFields,
  kind: VoiceCreateKind,
): { title?: string; content?: string; checklistItems?: string[] } {
  if (fields.title) {
    return {
      title: fields.title,
      content: fields.content,
      checklistItems: fields.listItemsText ? splitListItems(fields.listItemsText) : undefined,
    }
  }

  const cleaned = cleanRemainder(remainder)
  if (!cleaned) {
    return {
      title: fields.content ? fields.content.slice(0, 80) : undefined,
      content: fields.content,
      checklistItems: fields.listItemsText ? splitListItems(fields.listItemsText) : undefined,
    }
  }

  if (fields.content) {
    return {
      title: cleaned,
      content: fields.content,
      checklistItems: fields.listItemsText ? splitListItems(fields.listItemsText) : undefined,
    }
  }

  if (kind === 'checklist' && cleaned) {
    const items = splitListItems(cleaned)
    if (items.length >= 3 && ['lista', 'spesa', 'compere', 'elenco'].includes(items[0].toLowerCase())) {
      return {
        title: items[0],
        checklistItems: items.slice(1),
      }
    }
    if (items.length >= 2) {
      return { title: 'Lista', checklistItems: items }
    }
    return { title: 'Lista', checklistItems: items.length ? items : [cleaned] }
  }

  if (kind === 'note' && cleaned) {
    const title = makeNoteTitle(cleaned)
    const sameText = title.toLowerCase() === cleaned.toLowerCase()
    return {
      title,
      content: sameText ? undefined : cleaned,
    }
  }

  const parts = cleaned.split(/\s*,\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean)

  if (kind === 'checklist' && parts.length > 1) {
    return { title: parts[0], checklistItems: parts.slice(1) }
  }

  if (parts.length >= 2 && parts[0].length <= 60) {
    return { title: parts[0], content: parts.slice(1).join(', ') }
  }

  const words = cleaned.split(/\s+/)
  if (words.length >= 6) {
    const mid = Math.min(4, Math.ceil(words.length / 3))
    return {
      title: words.slice(0, mid).join(' '),
      content: words.slice(mid).join(' '),
    }
  }

  return {
    title: cleaned,
    content: fields.content,
    checklistItems: fields.listItemsText ? splitListItems(fields.listItemsText) : undefined,
  }
}

function matchCategory(raw?: string): string | undefined {
  if (!raw) return undefined
  const t = raw.toLowerCase()
  const expenseCategories = ['cibo', 'trasporti', 'svago', 'casa', 'salute', 'altro']
  for (const c of expenseCategories) {
    if (t.includes(c)) return c.charAt(0).toUpperCase() + c.slice(1)
  }
  const labels = [
    'abbonamenti',
    'streaming',
    'fitness',
    'assicurazione',
    'utilità',
    'utilita',
    'software',
    'telefonia',
  ]
  for (const l of labels) {
    if (t.includes(l.replace('à', 'a'))) {
      return l.charAt(0).toUpperCase() + l.slice(1).replace('utilita', 'Utilità')
    }
  }
  return raw.trim()
}

function normalizeEventLabel(raw?: string): string | undefined {
  if (!raw) return undefined
  return matchCategory(raw) ?? raw.charAt(0).toUpperCase() + raw.slice(1)
}

function extractInlineDate(text: string): string | undefined {
  return parseItalianDateFragment(text)
}

export function parseVoiceCreateCommand(
  rawTranscript: string,
): VoiceParseResult | VoiceParseFailure {
  const normalized = collapseRepeatedWords(normalizeTranscript(rawTranscript))
  if (normalized.length < 3) {
    return {
      ok: false,
      reason: 'Messaggio troppo corto.',
      hint: 'Detta liberamente: tipo, titolo e messaggio in qualsiasi ordine.',
    }
  }

  const kindHint =
    detectKindFromCreatePhrase(normalized) ??
    detectKind(normalized, findMarkers(normalized))

  const text = stripCreateCommandPrefix(normalized)

  const markers = findMarkers(text)
  const fields: ParsedFields = {}

  for (const m of markers) {
    if (m.field === 'kind') continue
    if (!fields[m.field]) fields[m.field] = m.value
  }

  const kind = kindHint ?? detectKind(text, markers) ?? inferKind(fields, text)

  const remainder = markers.reduce((acc, m) => {
    return acc.slice(0, m.start) + ' '.repeat(m.valueEnd - m.start) + acc.slice(m.valueEnd)
  }, text)

  const inferred = inferTitleAndContent(remainder, fields, kind)
  let title = inferred.title?.trim()
  let content = inferred.content?.trim()
  let checklistItems =
    kind === 'checklist'
      ? inferred.checklistItems ??
        (fields.listItemsText ? splitListItems(fields.listItemsText) : undefined) ??
        (content ? splitListItems(content) : undefined)
      : undefined

  if (!title && content) {
    title = makeNoteTitle(content)
  }

  if (!title) {
    const fallback = cleanRemainder(text)
    if (fallback.length >= 2) title = fallback
  }

  if (!title) {
    return {
      ok: false,
      reason: 'Non ho trovato un titolo o un testo da salvare.',
      hint: 'Detta ad es. «lista spesa latte e pane» oppure «titolo bolletta messaggio da pagare entro venerdì».',
    }
  }

  const area = fields.area?.trim()
  const category = matchCategory(fields.category)

  const amount =
    kind === 'expense'
      ? parseAmount(fields.amountText ?? text)
      : undefined
  const cost =
    kind === 'event'
      ? parseAmount(fields.costText ?? fields.amountText ?? text)
      : undefined

  const startDate = extractInlineDate(fields.startDateText ?? '')
  const endDate = extractInlineDate(fields.endDateText ?? '') ?? extractInlineDate(text)
  const renewalDate = extractInlineDate(fields.renewalDateText ?? '')

  const eventLabel =
    kind === 'event' ? normalizeEventLabel(fields.category) : undefined

  if (kind === 'checklist') {
    const items = splitListItems(
      checklistItems?.join('\n') ?? content ?? title ?? text,
    )
    if (items.length >= 2) {
      content = items.join('\n')
      checklistItems = items
      if (
        title.toLowerCase() === 'lista' &&
        ['spesa', 'compere', 'elenco'].includes(items[0].toLowerCase())
      ) {
        title = items[0]
      }
    } else if (items.length > 0) {
      content = items.join('\n')
      checklistItems = items
    }
  }

  return {
    ok: true,
    command: {
      kind,
      title,
      area,
      category: kind === 'expense' ? category ?? 'Altro' : category,
      amount,
      cost,
      content,
      startDate,
      endDate,
      renewalDate,
      checklistItems,
      labels: eventLabel ? [eventLabel] : undefined,
      rawTranscript: normalized,
    },
  }
}

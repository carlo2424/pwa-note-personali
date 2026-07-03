import { todayIso } from './countdown'

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

const STOP_WORDS = [
  ' area ',
  ' ambito ',
  ' categoria ',
  ' cat ',
  ' titolo ',
  ' nome ',
  ' importo ',
  ' costo ',
  ' euro ',
  ' euri ',
  ' contenuto ',
  ' testo ',
  ' descrizione ',
  ' scadenza ',
  ' data ',
  ' inizio ',
  ' fine ',
  ' rinnovo ',
  ' elementi ',
  ' voci ',
  ' etichetta ',
  ' label ',
]

const KIND_RULES: { kind: VoiceCreateKind; words: string[] }[] = [
  { kind: 'expense', words: ['spesa', 'spese', 'pagamento', 'acquisto'] },
  { kind: 'checklist', words: ['lista', 'checklist', 'elenco', 'to do', 'todo'] },
  { kind: 'event', words: ['impegno', 'impegni', 'abbonamento', 'rinnovo', 'evento'] },
  { kind: 'note', words: ['nota', 'note', 'appunto', 'promemoria'] },
]

function padIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return padIso(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseItalianDateFragment(fragment: string): string | undefined {
  const t = fragment.toLowerCase().trim()
  if (!t) return undefined
  if (/\boggi\b/.test(t)) return todayIso()
  if (/\bdomani\b/.test(t)) return addDaysIso(todayIso(), 1)
  if (/\bdopodomani\b/.test(t)) return addDaysIso(todayIso(), 2)

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

  return undefined
}

function parseAmount(text: string): number | undefined {
  const m = text.match(/(\d+(?:[.,]\d{1,2})?)/)
  if (!m) return undefined
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function normalizeTranscript(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim()
}

function detectKind(text: string): VoiceCreateKind | undefined {
  const lower = ` ${text.toLowerCase()} `
  for (const rule of KIND_RULES) {
    for (const word of rule.words) {
      if (lower.includes(` ${word} `) || lower.includes(` ${word},`)) {
        return rule.kind
      }
    }
  }
  return undefined
}

function extractField(
  text: string,
  keywords: string[],
): string | undefined {
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    const patterns = [
      new RegExp(`${kw}\\s*[:=]\\s*["']([^"']+)["']`, 'i'),
      new RegExp(`${kw}\\s+["']([^"']+)["']`, 'i'),
      new RegExp(`${kw}\\s*[:=]\\s*([^,]+)`, 'i'),
      new RegExp(`${kw}\\s+([^,]+)`, 'i'),
    ]
    for (const pattern of patterns) {
      const m = text.match(pattern)
      if (!m?.[1]) continue
      let value = m[1].trim()
      const valueLower = ` ${value.toLowerCase()} `
      for (const stop of STOP_WORDS) {
        const idx = valueLower.indexOf(stop)
        if (idx > 0) {
          value = value.slice(0, idx).trim()
        }
      }
      value = value.replace(/\s+(e|poi|con)\s*$/i, '').trim()
      if (value.length > 0) return value
    }
    const idx = lower.indexOf(kw)
    if (idx === -1) continue
  }
  return undefined
}

function extractTitle(text: string, kind: VoiceCreateKind): string | undefined {
  const fromField = extractField(text, [
    'titolo',
    'titoli',
    'nome',
    'intitolata',
    'intitolato',
    'chiamata',
    'chiamato',
  ])
  if (fromField) return fromField

  const lower = text.toLowerCase()
  const kindWord =
    KIND_RULES.find((r) => r.kind === kind)?.words[0] ?? kind
  const creaMatch = lower.match(
    new RegExp(
      `(?:crea(?:re)?|aggiungi|inserisci|nuova|nuovo)\\s+(?:un[a]?\\s+)?(?:${kindWord}|${kind})\\s+(?:con\\s+)?(?:titolo\\s+)?(.+)`,
      'i',
    ),
  )
  if (creaMatch?.[1]) {
    let rest = creaMatch[1].trim()
    const restLower = ` ${rest.toLowerCase()} `
    for (const stop of STOP_WORDS) {
      const idx = restLower.indexOf(stop)
      if (idx > 0) rest = rest.slice(0, idx).trim()
    }
    if (rest) return rest
  }

  return undefined
}

function extractListItems(text: string): string[] | undefined {
  const raw =
    extractField(text, ['elementi', 'voci', 'punti', 'elenco']) ??
    extractField(text, ['contenuto', 'testo'])
  if (!raw) return undefined
  const parts = raw
    .split(/[,;]|(?:\s+e\s+)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  return parts.length > 0 ? parts : undefined
}

function matchCategory(raw?: string): string | undefined {
  if (!raw) return undefined
  const t = raw.toLowerCase()
  const expenseCategories = [
    'cibo',
    'trasporti',
    'svago',
    'casa',
    'salute',
    'altro',
  ]
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
      return l.charAt(0).toUpperCase() + l.slice(1)
    }
  }
  return raw
}

export function parseVoiceCreateCommand(
  rawTranscript: string,
): VoiceParseResult | VoiceParseFailure {
  const text = normalizeTranscript(rawTranscript)
  if (text.length < 4) {
    return {
      ok: false,
      reason: 'Messaggio troppo corto.',
      hint: 'Esempio: «Crea una spesa, titolo benzina, importo 50 euro, categoria trasporti».',
    }
  }

  const kind = detectKind(text)
  if (!kind) {
    return {
      ok: false,
      reason: 'Non ho capito il tipo di voce.',
      hint: 'Inizia con: nota, lista, impegno o spesa. Es: «Crea un impegno titolo Bolletta luce».',
    }
  }

  let title = extractTitle(text, kind)
  if (!title) {
    if (kind === 'expense') {
      title =
        extractField(text, ['descrizione', 'testo']) ??
        extractField(text, ['spesa', 'pagamento'])
    }
  }
  if (!title) {
    return {
      ok: false,
      reason: 'Manca il titolo.',
      hint: 'Aggiungi «titolo …» oppure «crea una spesa benzina importo 20».',
    }
  }

  const area = extractField(text, ['area', 'ambito', 'in area'])
  const categoryRaw = extractField(text, ['categoria', 'cat', 'etichetta', 'label'])
  const category = matchCategory(categoryRaw)
  const content = extractField(text, ['contenuto', 'testo', 'descrizione', 'nota'])

  const amountRaw =
    extractField(text, ['importo', 'costo', 'euro', 'euri', 'spesa di', 'pagare']) ??
    text
  const amount = parseAmount(amountRaw)
  const costRaw = extractField(text, ['costo', 'importo', 'euro', 'abbonamento'])
  const cost = kind === 'event' ? parseAmount(costRaw ?? text) : undefined

  const scadenzaRaw = extractField(text, [
    'scadenza',
    'data fine',
    'fine',
    'fino al',
    'fino a',
  ])
  const inizioRaw = extractField(text, ['data inizio', 'inizio', 'dal', 'da'])
  const rinnovoRaw = extractField(text, ['rinnovo', 'prossimo addebito', 'addebito'])

  const startDate = parseItalianDateFragment(inizioRaw ?? '')
  const endDate = parseItalianDateFragment(scadenzaRaw ?? '')
  const renewalDate = parseItalianDateFragment(rinnovoRaw ?? '')

  const checklistItems = kind === 'checklist' ? extractListItems(text) : undefined

  const eventLabel =
    kind === 'event'
      ? normalizeEventLabel(
          extractField(text, ['etichetta', 'label', 'categoria', 'cat']),
        )
      : undefined

  return {
    ok: true,
    command: {
      kind,
      title,
      area,
      category: kind === 'expense' ? category ?? 'Altro' : category,
      amount: kind === 'expense' ? amount : undefined,
      cost: kind === 'event' ? cost : undefined,
      content,
      startDate,
      endDate,
      renewalDate,
      checklistItems,
      labels: eventLabel ? [eventLabel] : undefined,
      rawTranscript: text,
    },
  }
}

function normalizeEventLabel(raw?: string): string | undefined {
  if (!raw) return undefined
  const t = raw.toLowerCase()
  const presets = [
    'abbonamenti',
    'streaming',
    'fitness',
    'assicurazione',
    'utilità',
    'utilita',
    'software',
    'telefonia',
    'altro',
  ]
  for (const label of presets) {
    if (t.includes(label.replace('à', 'a'))) {
      return label.charAt(0).toUpperCase() + label.slice(1).replace('utilita', 'Utilità')
    }
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

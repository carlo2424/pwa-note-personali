/** Bozza nota estratta da file importato */
export type ImportedNoteDraft = {
  title: string
  content: string
  areaName?: string
  startDate?: string
  endDate?: string
}

const TITLE_KEYS = ['titolo', 'title', 'oggetto', 'nome', 'name']
const CONTENT_KEYS = [
  'contenuto',
  'content',
  'testo',
  'text',
  'descrizione',
  'note',
  'body',
]
const AREA_KEYS = ['area', 'ambito', 'categoria', 'category']
const START_KEYS = ['data inizio', 'inizio', 'start', 'dal', 'startdate']
const END_KEYS = ['data fine', 'fine', 'end', 'al', 'enddate', 'scadenza']

function cellText(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().trim().normalize('NFD').replace(/\p{M}/gu, '')
}

function headerMatches(header: string, keys: string[]): boolean {
  const n = normalizeHeader(header)
  return keys.some((k) => n === k || n.includes(k))
}

function looksLikeHeaderRow(cells: string[]): boolean {
  const filled = cells.filter(Boolean)
  if (filled.length === 0) return false
  const hits = filled.filter(
    (c) =>
      headerMatches(c, TITLE_KEYS) ||
      headerMatches(c, CONTENT_KEYS) ||
      headerMatches(c, AREA_KEYS) ||
      headerMatches(c, START_KEYS) ||
      headerMatches(c, END_KEYS),
  )
  return hits.length >= 1 && hits.length >= filled.length / 2
}

type ColumnMap = {
  title?: number
  content?: number
  area?: number
  startDate?: number
  endDate?: number
}

function mapHeaderColumns(headerRow: string[]): ColumnMap {
  const map: ColumnMap = {}
  headerRow.forEach((cell, index) => {
    if (headerMatches(cell, TITLE_KEYS)) map.title = index
    else if (headerMatches(cell, CONTENT_KEYS)) map.content = index
    else if (headerMatches(cell, AREA_KEYS)) map.area = index
    else if (headerMatches(cell, START_KEYS)) map.startDate = index
    else if (headerMatches(cell, END_KEYS)) map.endDate = index
  })
  return map
}

function parseIsoDate(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const d = new Date(trimmed)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return undefined
}

function rowToNote(cells: string[], map?: ColumnMap): ImportedNoteDraft | null {
  const nonEmpty = cells.map(cellText).filter(Boolean)
  if (nonEmpty.length === 0) return null

  if (map?.title != null) {
    const title = cellText(cells[map.title])
    if (!title) return null
    const contentParts: string[] = []
    if (map.content != null) {
      const c = cellText(cells[map.content])
      if (c) contentParts.push(c)
    } else {
      cells.forEach((cell, i) => {
        if (i === map.title || i === map.area || i === map.startDate || i === map.endDate)
          return
        const t = cellText(cell)
        if (t) contentParts.push(t)
      })
    }
    return {
      title,
      content: contentParts.join('\n'),
      areaName: map.area != null ? cellText(cells[map.area]) || undefined : undefined,
      startDate:
        map.startDate != null ? parseIsoDate(cellText(cells[map.startDate])) : undefined,
      endDate: map.endDate != null ? parseIsoDate(cellText(cells[map.endDate])) : undefined,
    }
  }

  if (nonEmpty.length === 1) {
    return { title: nonEmpty[0], content: '' }
  }

  if (nonEmpty.length === 2) {
    return { title: nonEmpty[0], content: nonEmpty[1] }
  }

  return {
    title: nonEmpty[0],
    content: nonEmpty.slice(1).join('\n'),
  }
}

/** Excel / CSV — prima pagina, righe e colonne flessibili */
export async function parseExcelFile(file: File): Promise<ImportedNoteDraft[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })

  if (rows.length === 0) return []

  const stringRows = rows.map((row) =>
    (Array.isArray(row) ? row : []).map(cellText),
  )

  let startIndex = 0
  let columnMap: ColumnMap | undefined

  if (looksLikeHeaderRow(stringRows[0])) {
    columnMap = mapHeaderColumns(stringRows[0])
    startIndex = 1
  }

  const notes: ImportedNoteDraft[] = []
  for (let i = startIndex; i < stringRows.length; i++) {
    const note = rowToNote(stringRows[i], columnMap)
    if (note) notes.push(note)
  }

  return notes
}

function titleFromText(text: string, fallback: string): { title: string; content: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    const base = fallback.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    return { title: base || 'Nota importata', content: '' }
  }

  if (lines.length === 1) {
    const line = lines[0]
    if (line.length > 80) {
      return { title: line.slice(0, 77) + '…', content: line }
    }
    return { title: line, content: '' }
  }

  return { title: lines[0], content: lines.slice(1).join('\n') }
}

/** Word (.docx) — testo del documento → 1 nota */
export async function parseWordFile(file: File): Promise<ImportedNoteDraft[]> {
  const mammoth = await import('mammoth')
  const buffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  const text = result.value.trim()
  if (!text) return []

  const { title, content } = titleFromText(text, file.name)
  return [{ title, content }]
}

/** PDF — testo estraibile → 1 nota (prima pagina se il file è lungo) */
export async function parsePdfFile(file: File): Promise<ImportedNoteDraft[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const pagesToRead = Math.min(pdf.numPages, 3)
  const parts: string[] = []

  for (let p = 1; p <= pagesToRead; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) parts.push(pageText)
  }

  const text = parts.join('\n\n').trim()
  if (!text) {
    throw new Error(
      'PDF senza testo selezionabile (probabilmente è solo un\'immagine scansionata).',
    )
  }

  const { title, content } = titleFromText(text, file.name)
  return [{ title, content }]
}

export async function parseImportFile(file: File): Promise<ImportedNoteDraft[]> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return parseExcelFile(file)
  }
  if (name.endsWith('.docx')) {
    return parseWordFile(file)
  }
  if (name.endsWith('.pdf')) {
    return parsePdfFile(file)
  }

  throw new Error('Formato non supportato. Usa Excel, CSV, Word (.docx) o PDF.')
}

export const IMPORT_ACCEPT =
  '.xlsx,.xls,.csv,.docx,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf'

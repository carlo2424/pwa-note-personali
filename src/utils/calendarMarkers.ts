export type CalendarMarkerType = 'event' | 'note' | 'task' | 'expense'

export const CALENDAR_MARKER_STYLE: Record<
  CalendarMarkerType,
  { dot: string; label: string }
> = {
  event: { dot: 'bg-indigo-500', label: 'Impegni' },
  note: { dot: 'bg-amber-500', label: 'Note' },
  task: { dot: 'bg-emerald-500', label: 'Attività' },
  expense: { dot: 'bg-rose-500', label: 'Spese' },
}

export function localIsoFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDay(
  map: Map<string, Set<CalendarMarkerType>>,
  iso: string,
  type: CalendarMarkerType,
) {
  if (!map.has(iso)) map.set(iso, new Set())
  map.get(iso)!.add(type)
}

function addRange(
  map: Map<string, Set<CalendarMarkerType>>,
  startIso: string,
  endIso: string | undefined,
  type: CalendarMarkerType,
) {
  const start = new Date(startIso + 'T00:00:00')
  const end = new Date((endIso ?? startIso) + 'T00:00:00')
  if (end < start) return

  const cursor = new Date(start)
  while (cursor <= end) {
    addDay(map, localIsoFromDate(cursor), type)
    cursor.setDate(cursor.getDate() + 1)
  }
}

type MarkerInput = {
  events?: {
    startDate: string
    endDate?: string
    renewalDate?: string
  }[]
  notes?: { startDate?: string; endDate?: string }[]
  tasks?: { dueDate?: string; listId?: number; done: boolean }[]
  taskLists?: { id?: number; dueDate?: string }[]
  expenses?: { date: string }[]
}

export function buildCalendarMarkers(input: MarkerInput): Map<string, CalendarMarkerType[]> {
  const map = new Map<string, Set<CalendarMarkerType>>()

  for (const event of input.events ?? []) {
    addRange(map, event.startDate, event.endDate, 'event')
    if (event.renewalDate) addDay(map, event.renewalDate, 'event')
  }

  for (const note of input.notes ?? []) {
    if (note.startDate) addRange(map, note.startDate, note.endDate, 'note')
    else if (note.endDate) addDay(map, note.endDate, 'note')
  }

  const listDueById = new Map<number, string>()
  for (const list of input.taskLists ?? []) {
    if (list.id && list.dueDate) listDueById.set(list.id, list.dueDate)
  }

  for (const task of input.tasks ?? []) {
    if (task.done) continue
    const due = task.dueDate ?? (task.listId ? listDueById.get(task.listId) : undefined)
    if (due) addDay(map, due, 'task')
  }

  for (const expense of input.expenses ?? []) {
    if (expense.date) addDay(map, expense.date.slice(0, 10), 'expense')
  }

  const result = new Map<string, CalendarMarkerType[]>()
  for (const [iso, types] of map) {
    result.set(iso, [...types])
  }
  return result
}

export function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = (first.getDay() + 6) % 7

  const cells: { iso: string | null; day: number | null }[] = []
  for (let i = 0; i < startPad; i++) cells.push({ iso: null, day: null })
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d)
    cells.push({ iso: localIsoFromDate(date), day: d })
  }
  return cells
}

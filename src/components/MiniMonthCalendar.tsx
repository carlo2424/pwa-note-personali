import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { sentenceCase } from '../utils/format'
import {
  buildCalendarMarkers,
  CALENDAR_MARKER_STYLE,
  formatCalendarDayTitle,
  getCalendarDayItems,
  getMonthGrid,
  localIsoFromDate,
  type CalendarDayItem,
  type CalendarMarkerType,
} from '../utils/calendarMarkers'

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function DayDots({ types }: { types: CalendarMarkerType[] }) {
  if (types.length === 0) return <span className="h-1" />
  return (
    <span className="flex h-1 items-center justify-center gap-0.5">
      {types.slice(0, 3).map((type) => (
        <span
          key={type}
          className={`h-1 w-1 rounded-full ${CALENDAR_MARKER_STYLE[type].dot}`}
        />
      ))}
    </span>
  )
}

function DayItemRow({ item }: { item: CalendarDayItem }) {
  const style = CALENDAR_MARKER_STYLE[item.type]
  return (
    <li className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-slate-800">
          {sentenceCase(item.title)}
        </p>
        <p className="truncate text-[10px] text-slate-500">
          {item.subtitle ?? style.label}
        </p>
      </div>
    </li>
  )
}

/** Vista mensile read-only con pallini colorati per eventi, note, attività e spese */
export function MiniMonthCalendar({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const rootRef = useRef<HTMLDivElement>(null)

  const events = useDexieLiveQuery(() => db.events.toArray())
  const notes = useDexieLiveQuery(() => db.notes.toArray())
  const tasks = useDexieLiveQuery(() => db.tasks.toArray())
  const taskLists = useDexieLiveQuery(() => db.taskLists.toArray())
  const expenses = useDexieLiveQuery(() => db.expenses.toArray())

  const markers = useMemo(
    () =>
      buildCalendarMarkers({
        events: events ?? [],
        notes: notes ?? [],
        tasks: tasks ?? [],
        taskLists: taskLists ?? [],
        expenses: expenses ?? [],
      }),
    [events, notes, tasks, taskLists, expenses],
  )

  const calendarInput = useMemo(
    () => ({
      events: events ?? [],
      notes: notes ?? [],
      tasks: tasks ?? [],
      taskLists: taskLists ?? [],
      expenses: expenses ?? [],
    }),
    [events, notes, tasks, taskLists, expenses],
  )

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return []
    return getCalendarDayItems(selectedDay, calendarInput)
  }, [selectedDay, calendarInput])

  const todayIso = localIsoFromDate(new Date())
  const cells = getMonthGrid(view.year, view.month)
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(
    'it-IT',
    { month: 'long', year: 'numeric' },
  )

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function prevMonth() {
    setSelectedDay(null)
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function nextMonth() {
    setSelectedDay(null)
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function goToToday() {
    const now = new Date()
    setSelectedDay(localIsoFromDate(now))
    setView({ year: now.getFullYear(), month: now.getMonth() })
  }

  const now = new Date()
  const isCurrentMonth =
    view.year === now.getFullYear() && view.month === now.getMonth()

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-center rounded-full transition ${
          compact ? 'h-8 w-8' : 'h-10 w-10'
        } ${
          open
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
        aria-label="Calendario mensile"
        aria-expanded={open}
      >
        <CalendarDays className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold capitalize text-slate-800">
                {monthLabel}
              </p>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={goToToday}
                  className="mt-0.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Oggi
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Mese successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((day, i) => (
              <span
                key={`${day}-${i}`}
                className="py-1 text-[10px] font-semibold text-slate-400"
              >
                {day}
              </span>
            ))}
            {cells.map((cell, index) => {
              if (!cell.iso || cell.day == null) {
                return <span key={`empty-${index}`} className="h-8" />
              }

              const types = markers.get(cell.iso) ?? []
              const isToday = cell.iso === todayIso
              const isSelected = cell.iso === selectedDay

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() =>
                    setSelectedDay((prev) =>
                      prev === cell.iso ? null : cell.iso,
                    )
                  }
                  className={`flex h-8 flex-col items-center justify-center rounded-lg transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white ring-1 ring-indigo-600'
                      : isToday
                        ? 'bg-indigo-50 ring-1 ring-indigo-200'
                        : 'hover:bg-slate-50'
                  } ${types.length > 0 && !isSelected ? 'font-semibold text-slate-800' : isSelected ? 'font-semibold' : 'text-slate-500'}`}
                  aria-label={`${cell.day} ${types.length > 0 ? `${types.length} voci` : 'nessuna voce'}`}
                  aria-pressed={isSelected}
                >
                  <span className="text-[11px] leading-none">{cell.day}</span>
                  <DayDots types={isSelected ? [] : types} />
                </button>
              )
            })}
          </div>

          {selectedDay && (
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold capitalize leading-snug text-slate-800">
                  {formatCalendarDayTitle(selectedDay)}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-600"
                  aria-label="Chiudi dettaglio giorno"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {selectedDayItems.length === 0 ? (
                <p className="text-[10px] text-slate-400">
                  Nessuna voce per questo giorno.
                </p>
              ) : (
                <ul className="max-h-36 space-y-1 overflow-y-auto">
                  {selectedDayItems.map((item) => (
                    <DayItemRow
                      key={`${item.type}-${item.id ?? item.title}`}
                      item={item}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2">
            {(Object.keys(CALENDAR_MARKER_STYLE) as CalendarMarkerType[]).map(
              (type) => (
                <span
                  key={type}
                  className="flex items-center gap-1 text-[10px] text-slate-500"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${CALENDAR_MARKER_STYLE[type].dot}`}
                  />
                  {CALENDAR_MARKER_STYLE[type].label}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}

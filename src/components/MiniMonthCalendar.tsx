import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import {
  buildCalendarMarkers,
  CALENDAR_MARKER_STYLE,
  getMonthGrid,
  localIsoFromDate,
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

/** Vista mensile read-only con pallini colorati per eventi, note, attività e spese */
export function MiniMonthCalendar() {
  const [open, setOpen] = useState(false)
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
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function nextMonth() {
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
          open
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
        aria-label="Calendario mensile"
        aria-expanded={open}
      >
        <CalendarDays className="h-5 w-5" />
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
            <p className="truncate text-sm font-semibold capitalize text-slate-800">
              {monthLabel}
            </p>
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

              return (
                <div
                  key={cell.iso}
                  className={`flex h-8 flex-col items-center justify-center rounded-lg ${
                    isToday ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''
                  } ${types.length > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
                  title={
                    types.length > 0
                      ? types.map((t) => CALENDAR_MARKER_STYLE[t].label).join(', ')
                      : undefined
                  }
                >
                  <span className="text-[11px] leading-none">{cell.day}</span>
                  <DayDots types={types} />
                </div>
              )
            })}
          </div>

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

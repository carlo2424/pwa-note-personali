import { CalendarDays, ListChecks, StickyNote, Wallet } from 'lucide-react'
import type { Note } from '../db'
import { formatAmount, sentenceCase } from '../utils/format'
import { deadlineLabel, noteKeyDate, noteSpotlight, type Spotlight } from '../utils/homeSpotlight'
import { isNoteChecklist } from '../utils/noteKind'

type EventRow = {
  kind: 'event'
  item: {
    title: string
    renewalDate?: string
    endDate?: string
    startDate: string
  }
}

function impegnoSpotFromRows(rows: EventRow[]): {
  title: string
  hint?: string
  urgent?: boolean
} | null {
  if (rows.length === 0) return null

  let best: { title: string; hint: string; days: number } | null = null

  for (const row of rows) {
    const iso =
      row.item.renewalDate ?? row.item.endDate ?? row.item.startDate
    const label = deadlineLabel(iso)
    if (!label) continue
    const days = Math.abs(
      new Date(iso + 'T00:00:00').getTime() - Date.now(),
    )
    if (!best || days < best.days) {
      best = { title: row.item.title, hint: label, days }
    }
  }

  if (best) {
    return { title: best.title, hint: best.hint, urgent: true }
  }

  return {
    title: rows[0].item.title,
    hint: `${rows.length} ${rows.length === 1 ? 'elemento' : 'elementi'}`,
  }
}

interface HomeSpotlightCardsProps {
  notes: Note[]
  impegnoRows: EventRow[]
  impegnoCount: number
  monthLabel: string
  monthPaid: number
  monthPlanned: number
  expenseDelta: number
  prevMonthExpenses: number
  areaNameById: (areaId?: number) => string | undefined
  onGoToNotes: () => void
  onGoToEvents: () => void
  onGoToExpenses: () => void
}

export function HomeSpotlightCards({
  notes,
  impegnoRows,
  impegnoCount,
  monthLabel,
  monthPaid,
  monthPlanned,
  expenseDelta,
  prevMonthExpenses,
  areaNameById,
  onGoToNotes,
  onGoToEvents,
  onGoToExpenses,
}: HomeSpotlightCardsProps) {
  const checklist = notes.filter(isNoteChecklist)
  const plain = notes.filter((n) => !isNoteChecklist(n))
  const focusNote = checklist[0] ?? plain[0]

  let noteSpot: Spotlight | null = null
  if (focusNote) {
    const area = areaNameById(focusNote.areaId)
    if (isNoteChecklist(focusNote)) {
      const parts = [
        focusNote.title,
        noteKeyDate(focusNote) ? deadlineLabel(noteKeyDate(focusNote)!) : '',
      ].filter(Boolean)
      noteSpot = noteSpotlight(focusNote, area, undefined)
      if (area) {
        noteSpot = {
          title: area,
          hint: parts.join(' · '),
          urgent: noteSpot.urgent,
        }
      } else {
        noteSpot.hint = parts.join(' · ')
      }
    } else {
      noteSpot = noteSpotlight(
        focusNote,
        area,
        focusNote.content?.slice(0, 40),
      )
    }
  }

  const impegnoSpot = impegnoSpotFromRows(impegnoRows)

  const NoteIcon = focusNote && isNoteChecklist(focusNote) ? ListChecks : StickyNote
  const noteIconClass =
    focusNote && isNoteChecklist(focusNote)
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700'

  const urgentCard = (urgent?: boolean) =>
    urgent
      ? 'border-amber-200 bg-amber-50/80 ring-1 ring-amber-100'
      : 'border-slate-100 bg-white'

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onGoToNotes}
          className={`rounded-xl border px-3 py-3 text-left shadow-sm active:scale-[0.99] ${urgentCard(noteSpot?.urgent)}`}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${noteIconClass}`}
            >
              <NoteIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              {noteSpot ? (
                <>
                  <p
                    className={`truncate text-base font-bold leading-tight ${noteSpot.urgent ? 'text-amber-900' : 'text-slate-900'}`}
                  >
                    {sentenceCase(noteSpot.title)}
                  </p>
                  {noteSpot.hint && (
                    <p
                      className={`mt-0.5 truncate text-xs ${noteSpot.urgent ? 'font-medium text-amber-700' : 'text-slate-500'}`}
                    >
                      {sentenceCase(noteSpot.hint)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Nessuna nota</p>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToEvents}
          className={`rounded-xl border px-3 py-3 text-left shadow-sm active:scale-[0.99] ${urgentCard(impegnoSpot?.urgent)}`}
        >
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              {impegnoSpot ? (
                <>
                  <p
                    className={`truncate text-base font-bold leading-tight ${impegnoSpot.urgent ? 'text-indigo-900' : 'text-slate-900'}`}
                  >
                    {sentenceCase(impegnoSpot.title)}
                  </p>
                  <p
                    className={`mt-0.5 truncate text-xs ${impegnoSpot.urgent ? 'font-medium text-indigo-700' : 'text-slate-500'}`}
                  >
                    {impegnoSpot.hint ??
                      `${impegnoCount} ${impegnoCount === 1 ? 'elemento' : 'elementi'}`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Nessun impegno</p>
              )}
            </div>
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={onGoToExpenses}
        className="w-full rounded-xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm hover:border-rose-200 active:scale-[0.99]"
      >
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-rose-600">
              {formatAmount(monthPaid)}
            </p>
            <p className="mt-0.5 text-xs capitalize text-slate-500">
              {sentenceCase(monthLabel)}
              {monthPlanned > 0
                ? ` · prev. ${formatAmount(monthPlanned)}`
                : ''}
            </p>
          </div>
        </div>
        {prevMonthExpenses > 0 && (
          <p
            className={`mt-2 pl-[2.875rem] text-[10px] font-medium ${expenseDelta > 0 ? 'text-rose-400' : expenseDelta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}
          >
            {expenseDelta > 0 ? '+' : ''}
            {formatAmount(expenseDelta)} vs mese scorso
          </p>
        )}
      </button>
    </div>
  )
}

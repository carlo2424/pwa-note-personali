import { ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db, type Event, type Expense, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { matchesArea, areaNameById, countDistinctAreaItems } from '../utils/areas'
import { countdownUrgency } from '../utils/countdown'
import { formatAmount, sentenceCase } from '../utils/format'
import {
  filterEventImpegni,
  filterNoteImpegni,
  filterPlainNotes,
} from '../utils/impegno'
import {
  currentMonthBounds,
  eventInCurrentMonth,
  expenseInCurrentMonth,
  noteInCurrentMonth,
} from '../utils/monthFilter'
import { AreaSidebar } from './AreaSidebar'
import { EventExpandableRow } from './EventExpandableRow'
import { MonthExpenseSummary } from './MonthExpenseSummary'
import { NoteExpandableRow } from './NoteExpandableRow'

const URGENCY_CONTAINER = {
  expired: 'border-rose-200 bg-rose-50',
  today: 'border-amber-200 bg-amber-50',
  soon: 'border-orange-200 bg-orange-50',
  ok: 'border-slate-100 bg-white',
}

function prevMonthRange(): { start: number; end: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
  return { start, end }
}

function SectionHeader({
  title,
  count,
  onSeeAll,
}: {
  title: string
  count: number
  onSeeAll?: () => void
}) {
  if (count === 0) return null
  return (
    <div className="mb-1 flex items-center justify-between">
      <h3 className="text-[10px] font-semibold text-slate-600">
        {sentenceCase(title)}
        <span className="ml-1 font-normal text-slate-400">
          ({count})
        </span>
      </h3>
      {onSeeAll && count > 0 && (
        <button
          type="button"
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-[9px] font-medium text-indigo-600"
        >
          Vedi tutti
          <ChevronRight className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

type ImpegnoRow =
  | { kind: 'event'; item: Event; sortKey: string }
  | { kind: 'note'; item: Note; sortKey: string }

export function HomeView({
  onEditEvent,
  onEditNote,
  onEditExpense,
  onOpenEventFromExpense,
  onGoToEvents,
  onGoToExpenses,
  onGoToNotes,
  onAddInArea,
}: {
  onEditEvent: (event: Event) => void
  onEditNote: (note: Note) => void
  onEditExpense: (expense: Expense) => void
  onOpenEventFromExpense?: (event: Event) => void
  onGoToEvents: () => void
  onGoToExpenses: () => void
  onGoToNotes: () => void
  onAddInArea: (areaName: string) => void
}) {
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null)
  const { label: monthLabel } = currentMonthBounds()

  const events = useDexieLiveQuery(
    () => db.events.orderBy('updatedAt').reverse().toArray(),
  )
  const expenses = useDexieLiveQuery(() => db.expenses.toArray())
  const notes = useDexieLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
  )
  const areas = useDexieLiveQuery(() => db.areas.orderBy('name').toArray())

  const areaFilterActive = selectedAreaId !== null

  const monthEvents = useMemo(
    () =>
      filterEventImpegni(events ?? []).filter(
        (e) => matchesArea(e, selectedAreaId) && eventInCurrentMonth(e),
      ),
    [events, selectedAreaId],
  )

  const monthNoteImpegni = useMemo(
    () =>
      filterNoteImpegni(notes ?? []).filter(
        (n) => matchesArea(n, selectedAreaId) && noteInCurrentMonth(n),
      ),
    [notes, selectedAreaId],
  )

  const monthPlainNotes = useMemo(
    () =>
      filterPlainNotes(notes ?? []).filter(
        (n) => matchesArea(n, selectedAreaId) && noteInCurrentMonth(n),
      ),
    [notes, selectedAreaId],
  )

  const monthExpensesList = useMemo(
    () =>
      [...(expenses ?? [])]
        .filter(
          (e) => matchesArea(e, selectedAreaId) && expenseInCurrentMonth(e),
        )
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [expenses, selectedAreaId],
  )

  const impegnoRows = useMemo((): ImpegnoRow[] => {
    const rows: ImpegnoRow[] = [
      ...monthEvents.map((item) => ({
        kind: 'event' as const,
        item,
        sortKey: item.startDate,
      })),
      ...monthNoteImpegni.map((item) => ({
        kind: 'note' as const,
        item,
        sortKey: item.startDate!,
      })),
    ]
    return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
  }, [monthEvents, monthNoteImpegni])

  const areaCounts = useMemo(() => {
    const counts = new Map<number, number>()
    const noteList = (notes ?? []).filter((n) => noteInCurrentMonth(n))
    const eventList = (events ?? []).filter((e) => eventInCurrentMonth(e))
    const expenseList = (expenses ?? []).filter((e) => expenseInCurrentMonth(e))
    for (const area of areas ?? []) {
      if (!area.id) continue
      counts.set(
        area.id,
        countDistinctAreaItems(noteList, eventList, expenseList, area.id),
      )
    }
    return counts
  }, [areas, notes, events, expenses])

  const totalAreaItems = countDistinctAreaItems(
    (notes ?? []).filter((n) => noteInCurrentMonth(n)),
    (events ?? []).filter((e) => eventInCurrentMonth(e)),
    (expenses ?? []).filter((e) => expenseInCurrentMonth(e)),
  )

  const impegnoCount = impegnoRows.length
  const noteCount = monthPlainNotes.length
  const expenseCount = monthExpensesList.length

  const monthExpensesTotal = monthExpensesList
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0)

  const { start: prevStart, end: prevEnd } = prevMonthRange()
  const prevMonthExpenses = (expenses ?? [])
    .filter((e) => {
      const t = new Date(e.date).getTime()
      return (
        matchesArea(e, selectedAreaId) &&
        t >= prevStart &&
        t <= prevEnd &&
        e.amount > 0
      )
    })
    .reduce((s, e) => s + e.amount, 0)

  const expenseDelta = monthExpensesTotal - prevMonthExpenses

  const monthlySubs = monthEvents
    .filter((e) => e.cost != null && e.cost > 0)
    .reduce((s, e) => s + e.cost!, 0)

  const urgentRenewals = monthEvents
    .filter((e) => e.renewalDate)
    .sort((a, b) => a.renewalDate!.localeCompare(b.renewalDate!))

  const selectedAreaName =
    selectedAreaId != null
      ? areas?.find((a) => a.id === selectedAreaId)?.name
      : null

  const loading =
    events === undefined ||
    expenses === undefined ||
    notes === undefined

  const isEmpty =
    !loading &&
    impegnoCount === 0 &&
    noteCount === 0 &&
    expenseCount === 0 &&
    !areaFilterActive

  const areaIsEmpty =
    !loading &&
    areaFilterActive &&
    impegnoCount === 0 &&
    noteCount === 0 &&
    expenseCount === 0

  if (loading) {
    return <p className="text-sm text-slate-400">Caricamento...</p>
  }

  const mainContent = (
    <div className="space-y-3">
      {areaFilterActive && selectedAreaName && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-indigo-900">
              {selectedAreaName}
            </h3>
            <button
              type="button"
              onClick={() => onAddInArea(selectedAreaName)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
              aria-label={`Aggiungi in ${selectedAreaName}`}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium text-indigo-700">
            <span>
              {noteCount} {noteCount === 1 ? 'nota' : 'note'}
            </span>
            <span>
              {impegnoCount} {impegnoCount === 1 ? 'impegno' : 'impegni'}
            </span>
            <span>
              {expenseCount} {expenseCount === 1 ? 'spesa' : 'spese'}
            </span>
          </div>
          <div className="mt-2 space-y-0.5 border-t border-indigo-100/80 pt-2">
            {monthExpensesTotal > 0 && (
              <p className="text-xs text-slate-600">
                Spese mese:{' '}
                <span className="font-bold text-rose-600">
                  {formatAmount(monthExpensesTotal)}
                </span>
                {prevMonthExpenses > 0 && (
                  <span
                    className={`ml-1 text-[10px] font-medium ${expenseDelta > 0 ? 'text-rose-400' : expenseDelta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}
                  >
                    ({expenseDelta > 0 ? '+' : ''}
                    {formatAmount(expenseDelta)} vs scorso)
                  </span>
                )}
              </p>
            )}
            {monthlySubs > 0 && (
              <p className="text-xs text-slate-600">
                Abbonamenti stimati:{' '}
                <span className="font-bold text-indigo-800">
                  {formatAmount(monthlySubs)}/mese
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {!areaFilterActive && (
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onGoToNotes}
            className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-left shadow-sm hover:border-amber-200"
          >
            <p className="text-[9px] font-medium text-slate-400">Note</p>
            <p className="mt-0.5 text-xs font-bold text-amber-700">{noteCount}</p>
          </button>
          <button
            type="button"
            onClick={onGoToEvents}
            className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-left shadow-sm hover:border-indigo-200"
          >
            <p className="text-[9px] font-medium text-slate-400">Impegni</p>
            <p className="mt-0.5 text-xs font-bold text-indigo-600">
              {impegnoCount}
            </p>
          </button>
          <button
            type="button"
            onClick={onGoToExpenses}
            className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-left shadow-sm hover:border-rose-200"
          >
            <p className="text-[9px] font-medium text-slate-400">Spese</p>
            <p className="mt-0.5 text-[10px] font-medium leading-tight text-rose-500">
              {sentenceCase(monthLabel)}
            </p>
            <p className="mt-0.5 text-xs font-bold text-rose-600">
              {formatAmount(monthExpensesTotal)}
            </p>
            {prevMonthExpenses > 0 && (
              <p
                className={`mt-0.5 text-[9px] font-medium leading-tight ${expenseDelta > 0 ? 'text-rose-400' : expenseDelta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {expenseDelta > 0 ? '+' : ''}
                {formatAmount(expenseDelta)} vs scorso
              </p>
            )}
          </button>
        </div>
      )}

      {urgentRenewals.length > 0 && (
        <section>
          <SectionHeader title="Rinnovi in arrivo" count={urgentRenewals.length} />
          <ul className="space-y-1">
            {urgentRenewals.map((event) => (
              <li key={event.id}>
                <EventExpandableRow
                  compact
                  event={event}
                  areaName={
                    areaFilterActive
                      ? undefined
                      : areaNameById(areas ?? [], event.areaId)
                  }
                  containerClassName={
                    event.renewalDate
                      ? URGENCY_CONTAINER[countdownUrgency(event.renewalDate)]
                      : 'border-slate-100 bg-white'
                  }
                  onEdit={() => onEditEvent(event)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {impegnoRows.length > 0 && (
        <section>
          <SectionHeader
            title="Impegni"
            count={impegnoCount}
            onSeeAll={onGoToEvents}
          />
          <ul className="space-y-1">
            {impegnoRows.map((row) =>
              row.kind === 'event' ? (
                <li key={`e-${row.item.id}`}>
                  <EventExpandableRow
                    compact
                    event={row.item}
                    areaName={
                      areaFilterActive
                        ? undefined
                        : areaNameById(areas ?? [], row.item.areaId)
                    }
                    containerClassName={
                      row.item.renewalDate
                        ? URGENCY_CONTAINER[countdownUrgency(row.item.renewalDate)]
                        : undefined
                    }
                    onEdit={() => onEditEvent(row.item)}
                  />
                </li>
              ) : (
                <li key={`n-${row.item.id}`}>
                  <NoteExpandableRow
                    compact
                    note={row.item}
                    areaName={
                      areaFilterActive
                        ? undefined
                        : areaNameById(areas ?? [], row.item.areaId)
                    }
                    onEdit={() => onEditNote(row.item)}
                  />
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {monthPlainNotes.length > 0 && (
        <section>
          <SectionHeader title="Note" count={noteCount} onSeeAll={onGoToNotes} />
          <ul className="space-y-1">
            {monthPlainNotes.map((note) => (
              <li key={note.id}>
                <NoteExpandableRow
                  compact
                  note={note}
                  areaName={
                    areaFilterActive
                      ? undefined
                      : areaNameById(areas ?? [], note.areaId)
                  }
                  onEdit={() => onEditNote(note)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {monthExpensesList.length > 0 && (
        <section>
          <SectionHeader
            title="Spese"
            count={expenseCount}
            onSeeAll={onGoToExpenses}
          />
          <MonthExpenseSummary
            compact
            monthLabel={monthLabel}
            expenses={monthExpensesList}
            areas={areas ?? []}
            onEdit={onEditExpense}
            onOpenEvent={onOpenEventFromExpense}
            hideAreaName={areaFilterActive}
          />
        </section>
      )}

      {areaIsEmpty && (
        <p className="py-4 text-center text-sm text-slate-400">
          Nessun elemento in{' '}
          <span className="font-medium">{selectedAreaName}</span> questo mese.
          <br />
          Usa il pulsante{' '}
          <span className="font-semibold text-indigo-600">+</span> in alto.
        </p>
      )}

      {isEmpty && (
        <p className="py-4 text-center text-sm text-slate-400">
          Niente in questo mese. Aggiungi con{' '}
          <span className="font-semibold text-indigo-600">+</span>.
        </p>
      )}
    </div>
  )

  return (
    <div className="flex gap-1">
      <AreaSidebar
        areas={areas ?? []}
        selectedAreaId={selectedAreaId}
        onSelect={setSelectedAreaId}
        counts={areaCounts}
        totalCount={totalAreaItems}
      />
      <div className="min-w-0 flex-1">{mainContent}</div>
    </div>
  )
}

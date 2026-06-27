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
import {
  isOverdueEvent,
  isOverdueNoteImpegno,
  tasksForNote,
} from '../utils/overdue'
import { AreaSidebar } from './AreaSidebar'
import { EventExpandableRow } from './EventExpandableRow'
import { ExpenseExpandableRow } from './ExpenseExpandableRow'
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
  alwaysShow = false,
  onAdd,
}: {
  title: string
  count: number
  onSeeAll?: () => void
  alwaysShow?: boolean
  onAdd?: () => void
}) {
  if (!alwaysShow && count === 0) return null
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <h3 className="text-[10px] font-semibold text-slate-600">
        {sentenceCase(title)}
        <span className="ml-1 font-normal text-slate-400">({count})</span>
      </h3>
      <div className="flex shrink-0 items-center gap-1">
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
            aria-label={`Aggiungi ${title.toLowerCase()}`}
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
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
    </div>
  )
}

function EmptySectionHint({
  label,
  onAdd,
}: {
  label: string
  onAdd?: () => void
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-center">
      <p className="text-[10px] text-slate-400">Nessun elemento</p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-800"
        >
          + Aggiungi {label}
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
  onAddInArea: (
    areaName: string,
    kind?: 'note' | 'event' | 'expense',
  ) => void
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
  const tasks = useDexieLiveQuery(() => db.tasks.toArray())

  const areaFilterActive = selectedAreaId !== null

  const overdueRows = useMemo((): ImpegnoRow[] => {
    const rows: ImpegnoRow[] = []
    const taskList = tasks ?? []

    for (const note of filterNoteImpegni(notes ?? [])) {
      if (!matchesArea(note, selectedAreaId)) continue
      const linked = tasksForNote(taskList, note.id)
      if (isOverdueNoteImpegno(note, linked)) {
        rows.push({
          kind: 'note',
          item: note,
          sortKey: note.endDate!,
        })
      }
    }

    for (const event of filterEventImpegni(events ?? [])) {
      if (!matchesArea(event, selectedAreaId)) continue
      if (isOverdueEvent(event)) {
        rows.push({
          kind: 'event',
          item: event,
          sortKey: event.endDate ?? event.renewalDate ?? event.startDate,
        })
      }
    }

    return rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [events, notes, tasks, selectedAreaId])

  const overdueEventIds = useMemo(
    () =>
      new Set(
        overdueRows
          .filter((r) => r.kind === 'event')
          .map((r) => r.item.id)
          .filter((id): id is number => id != null),
      ),
    [overdueRows],
  )

  const overdueNoteIds = useMemo(
    () =>
      new Set(
        overdueRows
          .filter((r) => r.kind === 'note')
          .map((r) => r.item.id)
          .filter((id): id is number => id != null),
      ),
    [overdueRows],
  )

  const monthEvents = useMemo(
    () =>
      filterEventImpegni(events ?? []).filter(
        (e) =>
          matchesArea(e, selectedAreaId) &&
          eventInCurrentMonth(e) &&
          !overdueEventIds.has(e.id!),
      ),
    [events, selectedAreaId, overdueEventIds],
  )

  const monthNoteImpegni = useMemo(
    () =>
      filterNoteImpegni(notes ?? []).filter(
        (n) =>
          matchesArea(n, selectedAreaId) &&
          noteInCurrentMonth(n) &&
          !overdueNoteIds.has(n.id!),
      ),
    [notes, selectedAreaId, overdueNoteIds],
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

  const areaEvents = useMemo(
    () =>
      filterEventImpegni(events ?? []).filter(
        (e) =>
          matchesArea(e, selectedAreaId) && !overdueEventIds.has(e.id!),
      ),
    [events, selectedAreaId, overdueEventIds],
  )

  const areaNoteImpegni = useMemo(
    () =>
      filterNoteImpegni(notes ?? []).filter(
        (n) =>
          matchesArea(n, selectedAreaId) && !overdueNoteIds.has(n.id!),
      ),
    [notes, selectedAreaId, overdueNoteIds],
  )

  const areaPlainNotes = useMemo(
    () =>
      filterPlainNotes(notes ?? []).filter((n) =>
        matchesArea(n, selectedAreaId),
      ),
    [notes, selectedAreaId],
  )

  const areaExpensesList = useMemo(
    () =>
      [...(expenses ?? [])]
        .filter((e) => matchesArea(e, selectedAreaId))
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

  const areaImpegniRows = useMemo((): ImpegnoRow[] => {
    const rows: ImpegnoRow[] = [
      ...areaEvents.map((item) => ({
        kind: 'event' as const,
        item,
        sortKey: item.startDate,
      })),
      ...areaNoteImpegni.map((item) => ({
        kind: 'note' as const,
        item,
        sortKey: item.startDate!,
      })),
    ]
    return rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
  }, [areaEvents, areaNoteImpegni])

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

  const displayImpegni = areaFilterActive ? areaImpegniRows : impegnoRows
  const displayNotes = areaFilterActive ? areaPlainNotes : monthPlainNotes
  const displayExpenses = areaFilterActive ? areaExpensesList : monthExpensesList

  const impegnoCount = displayImpegni.length
  const noteCount = displayNotes.length
  const expenseCount = displayExpenses.length

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

  const monthlySubs = (areaFilterActive ? areaEvents : monthEvents)
    .filter((e) => e.cost != null && e.cost > 0)
    .reduce((s, e) => s + e.cost!, 0)

  const renewalSource = areaFilterActive ? areaEvents : monthEvents
  const urgentRenewals = renewalSource
    .filter((e) => e.renewalDate && !overdueEventIds.has(e.id!))
    .sort((a, b) => a.renewalDate!.localeCompare(b.renewalDate!))

  const areaExpensesTotal = areaExpensesList
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0)

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

  if (loading) {
    return <p className="text-sm text-slate-400">Caricamento...</p>
  }

  const addInArea = selectedAreaName
    ? (kind: 'note' | 'event' | 'expense') => () => onAddInArea(selectedAreaName, kind)
    : undefined

  const impegnoList = (
    <ul className="space-y-1">
      {displayImpegni.map((row) =>
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
  )

  const noteList = (
    <ul className="space-y-1">
      {displayNotes.map((note) => (
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
  )

  const expenseList = areaFilterActive ? (
    <ul className="space-y-1">
      {displayExpenses.map((expense) => (
        <li key={expense.id}>
          <ExpenseExpandableRow
            compact
            expense={expense}
            onEdit={() => onEditExpense(expense)}
            onOpenEvent={onOpenEventFromExpense}
          />
        </li>
      ))}
    </ul>
  ) : (
    <MonthExpenseSummary
      compact
      monthLabel={monthLabel}
      expenses={displayExpenses}
      areas={areas ?? []}
      onEdit={onEditExpense}
      onOpenEvent={onOpenEventFromExpense}
      hideAreaName={false}
    />
  )

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
          <p className="mt-0.5 text-[10px] text-indigo-600/80">
            Riepilogo completo
          </p>
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
            {areaExpensesTotal > 0 && (
              <p className="text-xs text-slate-600">
                Spese totali:{' '}
                <span className="font-bold text-rose-600">
                  {formatAmount(areaExpensesTotal)}
                </span>
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

      {overdueRows.length > 0 && (
        <section>
          <SectionHeader
            title="In ritardo"
            count={overdueRows.length}
            onSeeAll={onGoToEvents}
          />
          <ul className="space-y-1">
            {overdueRows.map((row) =>
              row.kind === 'event' ? (
                <li key={`od-e-${row.item.id}`}>
                  <EventExpandableRow
                    compact
                    event={row.item}
                    areaName={
                      areaFilterActive
                        ? undefined
                        : areaNameById(areas ?? [], row.item.areaId)
                    }
                    containerClassName={URGENCY_CONTAINER.expired}
                    onEdit={() => onEditEvent(row.item)}
                  />
                </li>
              ) : (
                <li key={`od-n-${row.item.id}`}>
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

      {areaFilterActive ? (
        <>
          <section>
            <SectionHeader
              title="Note"
              count={noteCount}
              alwaysShow
              onAdd={addInArea?.('note')}
            />
            {displayNotes.length > 0 ? (
              noteList
            ) : (
              <EmptySectionHint label="nota" onAdd={addInArea?.('note')} />
            )}
          </section>

          <section>
            <SectionHeader
              title="Impegni"
              count={impegnoCount}
              alwaysShow
              onAdd={addInArea?.('event')}
            />
            {displayImpegni.length > 0 ? (
              impegnoList
            ) : (
              <EmptySectionHint label="impegno" onAdd={addInArea?.('event')} />
            )}
          </section>

          <section>
            <SectionHeader
              title="Spese"
              count={expenseCount}
              alwaysShow
              onAdd={addInArea?.('expense')}
            />
            {displayExpenses.length > 0 ? (
              expenseList
            ) : (
              <EmptySectionHint label="spesa" onAdd={addInArea?.('expense')} />
            )}
          </section>
        </>
      ) : (
        <>
          {displayImpegni.length > 0 && (
            <section>
              <SectionHeader
                title="Impegni"
                count={impegnoCount}
                onSeeAll={onGoToEvents}
              />
              {impegnoList}
            </section>
          )}

          {displayNotes.length > 0 && (
            <section>
              <SectionHeader
                title="Note"
                count={noteCount}
                onSeeAll={onGoToNotes}
              />
              {noteList}
            </section>
          )}

          {displayExpenses.length > 0 && (
            <section>
              <SectionHeader
                title="Spese"
                count={expenseCount}
                onSeeAll={onGoToExpenses}
              />
              {expenseList}
            </section>
          )}
        </>
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

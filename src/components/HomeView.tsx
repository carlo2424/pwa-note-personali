import {
  AlertTriangle,
  CalendarDays,
  Plus,
  RefreshCw,
  StickyNote,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { db, type Event, type Expense, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { areaNameById, countDistinctAreaItems } from '../utils/areas'
import {
  type AreaSelection,
  isAreaFilterActive,
  matchesAreaSelection,
  selectionLabel,
} from '../utils/areaSelection'
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
  computeMonthPaidTotal,
  computeMonthPlannedTotal,
} from '../utils/monthExpenseTotals'
import {
  isOverdueEvent,
  isOverdueNoteImpegno,
  tasksForNote,
} from '../utils/overdue'
import {
  shareEventsSection,
  shareExpensesSection,
  shareImpegnoRowsSection,
  shareNotesSection,
} from '../utils/share'
import { AreaChips } from './AreaChips'
import { CollapsibleSection, sectionIcon } from './CollapsibleSection'
import { EventExpandableRow } from './EventExpandableRow'
import { ExpenseExpandableRow } from './ExpenseExpandableRow'
import { MiniMonthCalendar } from './MiniMonthCalendar'
import { MonthExpenseSummary } from './MonthExpenseSummary'
import { NoteExpandableRow } from './NoteExpandableRow'

const URGENCY_CONTAINER = {
  expired: 'border-rose-200 bg-rose-50',
  today: 'border-amber-200 bg-amber-50',
  soon: 'border-orange-200 bg-orange-50',
  ok: 'border-slate-100 bg-white',
}

/** Macro-sezioni in vista area: sfondo pastello + contorno più leggibile */
const AREA_SECTION_STYLE = {
  note: 'border-amber-200/90 bg-amber-50/90 ring-1 ring-amber-100 shadow-sm',
  impegno: 'border-indigo-200/90 bg-indigo-50/80 ring-1 ring-indigo-100 shadow-sm',
  spesa: 'border-rose-200/90 bg-rose-50/80 ring-1 ring-rose-100 shadow-sm',
  rinnovi: 'border-emerald-200/90 bg-emerald-50/80 ring-1 ring-emerald-100 shadow-sm',
  ritardo: 'border-rose-300/80 bg-rose-50/90 ring-1 ring-rose-100 shadow-sm',
} as const

function prevMonthRange(): { start: number; end: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
  return { start, end }
}

function sumEventCosts(events: Event[]): number {
  return events.reduce(
    (s, e) => s + (e.cost != null && e.cost > 0 ? e.cost : 0),
    0,
  )
}

function sumImpegnoCosts(rows: ImpegnoRow[]): number {
  return rows.reduce((s, row) => {
    if (row.kind === 'event' && row.item.cost != null && row.item.cost > 0) {
      return s + row.item.cost
    }
    return s
  }, 0)
}

function sumPositiveExpenses(expenses: Expense[]): number {
  return expenses
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0)
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
  const [areaSelection, setAreaSelection] = useState<AreaSelection>({
    kind: 'all',
  })
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

  const areaList = areas ?? []
  const areaFilterActive = isAreaFilterActive(areaSelection)

  const overdueRows = useMemo((): ImpegnoRow[] => {
    const rows: ImpegnoRow[] = []
    const taskList = tasks ?? []

    for (const note of filterNoteImpegni(notes ?? [])) {
      if (!matchesAreaSelection(note, areaSelection, areaList)) continue
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
      if (!matchesAreaSelection(event, areaSelection, areaList)) continue
      if (isOverdueEvent(event)) {
        rows.push({
          kind: 'event',
          item: event,
          sortKey: event.endDate ?? event.renewalDate ?? event.startDate,
        })
      }
    }

    return rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [events, notes, tasks, areaSelection, areaList])

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
          matchesAreaSelection(e, areaSelection, areaList) &&
          eventInCurrentMonth(e) &&
          !overdueEventIds.has(e.id!),
      ),
    [events, areaSelection, areaList, overdueEventIds],
  )

  const monthNoteImpegni = useMemo(
    () =>
      filterNoteImpegni(notes ?? []).filter(
        (n) =>
          matchesAreaSelection(n, areaSelection, areaList) &&
          noteInCurrentMonth(n) &&
          !overdueNoteIds.has(n.id!),
      ),
    [notes, areaSelection, areaList, overdueNoteIds],
  )

  const monthPlainNotes = useMemo(
    () =>
      filterPlainNotes(notes ?? []).filter(
        (n) => matchesAreaSelection(n, areaSelection, areaList) && noteInCurrentMonth(n),
      ),
    [notes, areaSelection, areaList],
  )

  const monthExpensesList = useMemo(
    () =>
      [...(expenses ?? [])]
        .filter(
          (e) => matchesAreaSelection(e, areaSelection, areaList) && expenseInCurrentMonth(e),
        )
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [expenses, areaSelection, areaList],
  )

  const areaEvents = useMemo(
    () =>
      filterEventImpegni(events ?? []).filter(
        (e) =>
          matchesAreaSelection(e, areaSelection, areaList) && !overdueEventIds.has(e.id!),
      ),
    [events, areaSelection, areaList, overdueEventIds],
  )

  const areaNoteImpegni = useMemo(
    () =>
      filterNoteImpegni(notes ?? []).filter(
        (n) =>
          matchesAreaSelection(n, areaSelection, areaList) && !overdueNoteIds.has(n.id!),
      ),
    [notes, areaSelection, areaList, overdueNoteIds],
  )

  const areaPlainNotes = useMemo(
    () =>
      filterPlainNotes(notes ?? []).filter((n) =>
        matchesAreaSelection(n, areaSelection, areaList),
      ),
    [notes, areaSelection, areaList],
  )

  const areaExpensesList = useMemo(
    () =>
      [...(expenses ?? [])]
        .filter((e) => matchesAreaSelection(e, areaSelection, areaList))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [expenses, areaSelection, areaList],
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

  const monthExpensesTotal = computeMonthPaidTotal(expenses ?? [])

  const monthPlannedTotal = useMemo(
    () => computeMonthPlannedTotal(events ?? []),
    [events],
  )

  const { start: prevStart, end: prevEnd } = prevMonthRange()
  const prevMonthExpenses = (expenses ?? [])
    .filter((e) => {
      const t = new Date(e.date).getTime()
      return (
        matchesAreaSelection(e, areaSelection, areaList) &&
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

  const selectedAreaName = selectionLabel(areaSelection, areaList)

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

  const addInArea =
    selectedAreaName && areaSelection.kind === 'area'
      ? (kind: 'note' | 'event' | 'expense') => () =>
          onAddInArea(selectedAreaName, kind)
      : undefined

  const shareAreaContext = areaFilterActive ? selectedAreaName ?? undefined : undefined

  const shareSectionNotes = () =>
    void shareNotesSection(displayNotes, {
      areaName: shareAreaContext,
      sectionTitle: shareAreaContext ? `Note · ${shareAreaContext}` : 'Note',
    })

  const shareSectionImpegni = () =>
    void shareImpegnoRowsSection(displayImpegni, (id) => areaNameById(areas ?? [], id), {
      sectionTitle: shareAreaContext ? `Impegni · ${shareAreaContext}` : 'Impegni',
      hideArea: areaSelection.kind === 'area',
      footer:
        impegnoTotal > 0 ? `Totale costi: ${formatAmount(impegnoTotal)}` : undefined,
    })

  const shareSectionExpenses = () =>
    void shareExpensesSection(displayExpenses, {
      areaName: shareAreaContext,
      sectionTitle: shareAreaContext ? `Spese · ${shareAreaContext}` : 'Spese',
      monthLabel: areaFilterActive ? undefined : sentenceCase(monthLabel),
      footer: speseTotal > 0 ? `Totale: ${formatAmount(speseTotal)}` : undefined,
    })

  const shareSectionRenewals = () =>
    void shareEventsSection(urgentRenewals, {
      sectionTitle: 'Rinnovi in arrivo',
      context: shareAreaContext ? `Area: ${shareAreaContext}` : undefined,
      resolveArea: areaFilterActive && areaSelection.kind === 'area'
        ? undefined
        : (e) => areaNameById(areas ?? [], e.areaId),
      footer:
        renewalsTotal > 0
          ? `Totale: ${formatAmount(renewalsTotal)}/mese`
          : undefined,
    })

  const shareSectionOverdue = () =>
    void shareImpegnoRowsSection(overdueRows, (id) => areaNameById(areas ?? [], id), {
      sectionTitle: 'In ritardo',
      hideArea: areaSelection.kind === 'area',
      footer:
        overdueTotal > 0 ? `Totale costi: ${formatAmount(overdueTotal)}` : undefined,
    })

  const impegnoList = (
    <ul className="space-y-1">
      {displayImpegni.map((row) =>
        row.kind === 'event' ? (
          <li key={`e-${row.item.id}`}>
            <EventExpandableRow
              compact
              event={row.item}
              areaName={
                areaSelection.kind === 'area'
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
                areaSelection.kind === 'area'
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
              areaSelection.kind === 'area'
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
      nested
      compact
      monthLabel={monthLabel}
      expenses={displayExpenses}
      areas={areas ?? []}
      onEdit={onEditExpense}
      onOpenEvent={onOpenEventFromExpense}
      hideAreaName={false}
    />
  )

  const renewalsTotal = sumEventCosts(urgentRenewals)
  const overdueTotal = sumImpegnoCosts(overdueRows)
  const impegnoTotal = sumImpegnoCosts(displayImpegni)
  const speseTotal = sumPositiveExpenses(displayExpenses)

  const noteSectionIcon = sectionIcon(
    'bg-amber-100 text-amber-700 h-9 w-9',
    <StickyNote className="h-4 w-4" />,
  )
  const impegnoSectionIcon = sectionIcon(
    'bg-indigo-100 text-indigo-700 h-9 w-9',
    <CalendarDays className="h-4 w-4" />,
  )
  const speseSectionIcon = sectionIcon(
    'bg-rose-100 text-rose-600 h-9 w-9',
    <Wallet className="h-4 w-4" />,
  )

  const sectionComfort = { comfortable: true as const }

  const mainContent = (
    <div className="space-y-3">
      {areaFilterActive && selectedAreaName && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-indigo-900">
              {selectedAreaName}
            </h3>
            {areaSelection.kind === 'area' && (
              <button
                type="button"
                onClick={() => onAddInArea(selectedAreaName)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
                aria-label={`Aggiungi in ${selectedAreaName}`}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-indigo-600/80">
            {areaSelection.kind === 'group'
              ? 'Riepilogo gruppo'
              : 'Riepilogo completo'}
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
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onGoToNotes}
              className="rounded-xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm hover:border-amber-200 active:scale-[0.99]"
            >
              <p className="text-xs font-medium text-slate-500">Note</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{noteCount}</p>
            </button>
            <button
              type="button"
              onClick={onGoToEvents}
              className="rounded-xl border border-slate-100 bg-white px-3 py-3 text-center shadow-sm hover:border-indigo-200 active:scale-[0.99]"
            >
              <p className="text-xs font-medium text-slate-500">Impegni</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">
                {impegnoCount}
              </p>
            </button>
          </div>
          <button
            type="button"
            onClick={onGoToExpenses}
            className="w-full rounded-xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm hover:border-rose-200 active:scale-[0.99]"
          >
            <p className="text-xs font-medium text-slate-500">
              Spese ·{' '}
              <span className="capitalize text-rose-500">
                {sentenceCase(monthLabel)}
              </span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Pagato
                </p>
                <p className="mt-0.5 text-base font-bold text-rose-600">
                  {formatAmount(monthExpensesTotal)}
                </p>
              </div>
              <div className="min-w-0 border-l border-rose-100 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Previsto
                </p>
                <p className="mt-0.5 text-base font-bold text-orange-600">
                  {formatAmount(monthPlannedTotal)}
                </p>
              </div>
            </div>
            {prevMonthExpenses > 0 && (
              <p
                className={`mt-2 text-[10px] font-medium ${expenseDelta > 0 ? 'text-rose-400' : expenseDelta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                Pagato: {expenseDelta > 0 ? '+' : ''}
                {formatAmount(expenseDelta)} vs mese scorso
              </p>
            )}
          </button>
        </div>
      )}

      {overdueRows.length > 0 && (
        <CollapsibleSection
          {...sectionComfort}
          title="In ritardo"
          count={overdueRows.length}
          icon={sectionIcon(
            'bg-rose-100 text-rose-700',
            <AlertTriangle className="h-3.5 w-3.5" />,
          )}
          containerClassName={
            areaFilterActive
              ? AREA_SECTION_STYLE.ritardo
              : 'border-rose-200 bg-rose-50/40'
          }
          totalAmount={overdueTotal > 0 ? overdueTotal : undefined}
          onSeeAll={onGoToEvents}
          onShare={shareSectionOverdue}
        >
          <ul className="space-y-1">
            {overdueRows.map((row) =>
              row.kind === 'event' ? (
                <li key={`od-e-${row.item.id}`}>
                  <EventExpandableRow
                    compact
                    event={row.item}
                    areaName={
                      areaSelection.kind === 'area'
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
                      areaSelection.kind === 'area'
                        ? undefined
                        : areaNameById(areas ?? [], row.item.areaId)
                    }
                    onEdit={() => onEditNote(row.item)}
                  />
                </li>
              ),
            )}
          </ul>
        </CollapsibleSection>
      )}

      {urgentRenewals.length > 0 && (
        <CollapsibleSection
          {...sectionComfort}
          title="Rinnovi in arrivo"
          count={urgentRenewals.length}
          icon={sectionIcon(
            'bg-emerald-100 text-emerald-700',
            <RefreshCw className="h-3.5 w-3.5" />,
          )}
          containerClassName={
            areaFilterActive
              ? AREA_SECTION_STYLE.rinnovi
              : 'border-slate-100 bg-white'
          }
          totalAmount={renewalsTotal > 0 ? renewalsTotal : undefined}
          totalSuffix="/mese"
          onSeeAll={onGoToEvents}
          onShare={shareSectionRenewals}
        >
          <ul className="space-y-1">
            {urgentRenewals.map((event) => (
              <li key={event.id}>
                <EventExpandableRow
                  compact
                  event={event}
                  areaName={
                    areaSelection.kind === 'area'
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
        </CollapsibleSection>
      )}

      {areaFilterActive ? (
        <div className="space-y-2.5">
          <CollapsibleSection
            {...sectionComfort}
            title="Note"
            count={noteCount}
            alwaysShow
            icon={noteSectionIcon}
            containerClassName={AREA_SECTION_STYLE.note}
            onAdd={addInArea?.('note')}
            onShare={noteCount > 0 ? shareSectionNotes : undefined}
            emptyContent={
              <EmptySectionHint label="nota" onAdd={addInArea?.('note')} />
            }
          >
            {noteList}
          </CollapsibleSection>

          <CollapsibleSection
            {...sectionComfort}
            title="Impegni"
            count={impegnoCount}
            alwaysShow
            icon={impegnoSectionIcon}
            containerClassName={AREA_SECTION_STYLE.impegno}
            totalAmount={impegnoTotal > 0 ? impegnoTotal : undefined}
            onAdd={addInArea?.('event')}
            onShare={impegnoCount > 0 ? shareSectionImpegni : undefined}
            emptyContent={
              <EmptySectionHint label="impegno" onAdd={addInArea?.('event')} />
            }
          >
            {impegnoList}
          </CollapsibleSection>

          <CollapsibleSection
            {...sectionComfort}
            title="Spese"
            count={expenseCount}
            alwaysShow
            icon={speseSectionIcon}
            containerClassName={AREA_SECTION_STYLE.spesa}
            totalAmount={speseTotal > 0 ? speseTotal : undefined}
            onAdd={addInArea?.('expense')}
            onShare={expenseCount > 0 ? shareSectionExpenses : undefined}
            emptyContent={
              <EmptySectionHint label="spesa" onAdd={addInArea?.('expense')} />
            }
          >
            {expenseList}
          </CollapsibleSection>
        </div>
      ) : (
        <>
          {displayImpegni.length > 0 && (
            <CollapsibleSection
              {...sectionComfort}
              title="Impegni"
              count={impegnoCount}
              icon={impegnoSectionIcon}
              totalAmount={impegnoTotal > 0 ? impegnoTotal : undefined}
              onSeeAll={onGoToEvents}
              onShare={shareSectionImpegni}
            >
              {impegnoList}
            </CollapsibleSection>
          )}

          {displayNotes.length > 0 && (
            <CollapsibleSection
              {...sectionComfort}
              title="Note"
              count={noteCount}
              icon={noteSectionIcon}
              onSeeAll={onGoToNotes}
              onShare={shareSectionNotes}
            >
              {noteList}
            </CollapsibleSection>
          )}

          {displayExpenses.length > 0 && (
            <CollapsibleSection
              {...sectionComfort}
              title="Spese"
              count={expenseCount}
              icon={speseSectionIcon}
              subtitle={`${sentenceCase(monthLabel)} · ${expenseCount} ${expenseCount === 1 ? 'movimento' : 'movimenti'}`}
              totalAmount={speseTotal > 0 ? speseTotal : undefined}
              onSeeAll={onGoToExpenses}
              onShare={shareSectionExpenses}
            >
              {expenseList}
            </CollapsibleSection>
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
    <div className="min-w-0">
      <AreaChips
        areas={areas ?? []}
        selection={areaSelection}
        onSelect={setAreaSelection}
        counts={areaCounts}
        totalCount={totalAreaItems}
        headerTrailing={<MiniMonthCalendar compact />}
      />
      {mainContent}
    </div>
  )
}

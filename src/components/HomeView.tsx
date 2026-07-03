import {
  AlertTriangle,
  CalendarDays,
  Plus,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { db, type Event, type Expense, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { areaHomeLabel, areaNameById, countDistinctAreaItems } from '../utils/areas'
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
} from '../utils/monthFilter'
import {
  computeMonthPaidTotal,
  computeMonthPlannedTotal,
  sumOccurredPositiveExpenses,
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
} from '../utils/share'
import { deadlineLabel, sortNotesByUrgency } from '../utils/homeSpotlight'
import { buildHomeFeedItems, isHomeFeedQuiet } from '../utils/homeFeed'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import { noteVisibleOnHome } from '../utils/homeReminders'
import { AreaChips } from './AreaChips'
import { CollapsibleSection, sectionIcon } from './CollapsibleSection'
import { EventExpandableRow } from './EventExpandableRow'
import { ExpenseExpandableRow } from './ExpenseExpandableRow'
import { HomeSpotlightCards } from './HomeSpotlightCards'
import { MiniMonthCalendar } from './MiniMonthCalendar'
import { MonthExpenseSummary } from './MonthExpenseSummary'
import { NoteExpandableRow } from './NoteExpandableRow'

const AREA_SECTION_STYLE = {
  note: ITEM_TYPE_STYLE.note.section,
  impegno: ITEM_TYPE_STYLE.event.section,
  spesa: ITEM_TYPE_STYLE.expense.section,
  rinnovi: 'border-emerald-200/90 bg-emerald-50/80 ring-1 ring-emerald-100 shadow-sm',
  ritardo: 'border-rose-300/80 bg-rose-50/90 ring-1 ring-rose-100 shadow-sm',
} as const

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
  onAddInArea,
}: {
  onEditEvent: (event: Event) => void
  onEditNote: (note: Note) => void
  onEditExpense: (expense: Expense) => void
  onOpenEventFromExpense?: (event: Event) => void
  onGoToEvents: () => void
  onGoToExpenses: () => void
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
          noteVisibleOnHome(n) &&
          !overdueNoteIds.has(n.id!),
      ),
    [notes, areaSelection, areaList, overdueNoteIds],
  )

  const monthHomeNotes = useMemo(
    () =>
      (notes ?? []).filter(
        (n) =>
          matchesAreaSelection(n, areaSelection, areaList) &&
          noteVisibleOnHome(n) &&
          !overdueNoteIds.has(n.id!),
      ),
    [notes, areaSelection, areaList, overdueNoteIds],
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
    const noteList = (notes ?? []).filter((n) => noteVisibleOnHome(n))
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
    (notes ?? []).filter((n) => noteVisibleOnHome(n)),
    (events ?? []).filter((e) => eventInCurrentMonth(e)),
    (expenses ?? []).filter((e) => expenseInCurrentMonth(e)),
  )

  const displayImpegni = areaFilterActive ? areaImpegniRows : impegnoRows
  const displayNotes = areaFilterActive ? areaPlainNotes : monthHomeNotes
  const displayExpenses = areaFilterActive ? areaExpensesList : monthExpensesList

  const impegnoCount = displayImpegni.length
  const noteCount = displayNotes.length
  const expenseCount = displayExpenses.length

  const monthExpensesTotal = computeMonthPaidTotal(expenses ?? [])

  const monthPlannedTotal = useMemo(
    () => computeMonthPlannedTotal(events ?? []),
    [events],
  )

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

  const sortedDisplayNotes = useMemo(
    () => [...displayNotes].sort(sortNotesByUrgency),
    [displayNotes],
  )

  const homeFeedQuiet = useMemo(
    () =>
      areaFilterActive ||
      isHomeFeedQuiet(notes ?? [], events ?? [], expenses ?? []),
    [areaFilterActive, notes, events, expenses],
  )

  const homeFeedItems = useMemo(() => {
    if (areaFilterActive) return []
    const renewalIds = new Set(
      urgentRenewals.map((e) => e.id).filter((id): id is number => id != null),
    )
    return buildHomeFeedItems(notes ?? [], events ?? [], expenses ?? []).filter(
      (row) => {
        if (row.kind === 'note' && row.item.id && overdueNoteIds.has(row.item.id)) {
          return false
        }
        if (row.kind === 'event' && row.item.id) {
          if (overdueEventIds.has(row.item.id)) return false
          if (renewalIds.has(row.item.id)) return false
        }
        return true
      },
    )
  }, [
    areaFilterActive,
    notes,
    events,
    expenses,
    overdueNoteIds,
    overdueEventIds,
    urgentRenewals,
  ])

  const impegnoSectionSubtitle = useMemo(() => {
    for (const row of displayImpegni) {
      if (row.kind !== 'event') continue
      const iso =
        row.item.renewalDate ?? row.item.endDate ?? row.item.startDate
      const label = deadlineLabel(iso)
      if (label) return label
    }
    return `${impegnoCount} ${impegnoCount === 1 ? 'elemento' : 'elementi'}`
  }, [displayImpegni, impegnoCount])

  const impegnoSectionUrgent = useMemo(() => {
    for (const row of displayImpegni) {
      if (row.kind !== 'event') continue
      const iso =
        row.item.renewalDate ?? row.item.endDate ?? row.item.startDate
      const u = countdownUrgency(iso)
      if (u === 'expired' || u === 'today' || u === 'soon') return true
    }
    return false
  }, [displayImpegni])

  if (loading) {
    return <p className="text-sm text-slate-400">Caricamento...</p>
  }

  const addInArea =
    selectedAreaName && areaSelection.kind === 'area'
      ? (kind: 'note' | 'event' | 'expense') => () =>
          onAddInArea(selectedAreaName, kind)
      : undefined

  const shareAreaContext = areaFilterActive ? selectedAreaName ?? undefined : undefined

  const promoteNoteAreaTitle =
    !areaFilterActive || areaSelection.kind === 'group'

  const impegnoSectionTitle =
    displayImpegni[0]?.item.title ?? ''

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
              showTypeLabel
              event={row.item}
              areaName={
                areaSelection.kind === 'area'
                  ? undefined
                  : areaNameById(areas ?? [], row.item.areaId)
              }
              onEdit={() => onEditEvent(row.item)}
            />
          </li>
        ) : (
          <li key={`n-${row.item.id}`}>
            <NoteExpandableRow
              compact
              showTypeLabel
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

  const noteRowsList = (
    <ul className="space-y-2">
      {sortedDisplayNotes.map((note) => {
        const areaLabel =
          areaSelection.kind === 'area'
            ? {}
            : areaHomeLabel(areas ?? [], note.areaId)
        return (
          <li key={note.id}>
            <NoteExpandableRow
              compact
              showTypeLabel
              note={note}
              promoteAreaTitle={promoteNoteAreaTitle}
              areaName={areaLabel.title}
              areaMember={areaLabel.member}
              onEdit={() => onEditNote(note)}
            />
          </li>
        )
      })}
    </ul>
  )

  const homeFeedList = (
    <ul className="space-y-2">
      {homeFeedItems.map((row) => {
        if (row.kind === 'note') {
          const { title, member } = areaHomeLabel(areas ?? [], row.item.areaId)
          return (
            <li key={`feed-n-${row.item.id}`}>
              <NoteExpandableRow
                compact
                showTypeLabel
                note={row.item}
                promoteAreaTitle
                areaName={title}
                areaMember={member}
                onEdit={() => onEditNote(row.item)}
              />
            </li>
          )
        }
        if (row.kind === 'event') {
          return (
            <li key={`feed-e-${row.item.id}`}>
              <EventExpandableRow
                compact
                showTypeLabel
                event={row.item}
                areaName={areaNameById(areas ?? [], row.item.areaId)}
                onEdit={() => onEditEvent(row.item)}
              />
            </li>
          )
        }
        return (
          <li key={`feed-x-${row.item.id}`}>
            <ExpenseExpandableRow
              compact
              showTypeLabel
              expense={row.item}
              promoteAreaTitle
              areaName={areaNameById(areas ?? [], row.item.areaId)}
              onEdit={() => onEditExpense(row.item)}
              onOpenEvent={onOpenEventFromExpense}
            />
          </li>
        )
      })}
    </ul>
  )

  const expenseList = areaFilterActive ? (
    <ul className="space-y-1">
      {displayExpenses.map((expense) => (
        <li key={expense.id}>
          <ExpenseExpandableRow
            compact
            showTypeLabel
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
      showTypeLabel
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
  const speseTotal = sumOccurredPositiveExpenses(displayExpenses)

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
        <HomeSpotlightCards
          monthLabel={monthLabel}
          monthPaid={monthExpensesTotal}
          monthPlanned={monthPlannedTotal}
          onGoToExpenses={onGoToExpenses}
        />
      )}

      {!areaFilterActive && !homeFeedQuiet && homeFeedItems.length > 0 && homeFeedList}

      {!homeFeedQuiet && overdueRows.length > 0 && (
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
                    showTypeLabel
                    event={row.item}
                    areaName={
                      areaSelection.kind === 'area'
                        ? undefined
                        : areaNameById(areas ?? [], row.item.areaId)
                    }
                    onEdit={() => onEditEvent(row.item)}
                  />
                </li>
              ) : (
                <li key={`od-n-${row.item.id}`}>
                  <NoteExpandableRow
                    compact
                    showTypeLabel
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

      {areaFilterActive ? (
        <div className="space-y-2.5">
          {noteCount > 0 ? (
            noteRowsList
          ) : (
            <EmptySectionHint label="nota o lista" onAdd={addInArea?.('note')} />
          )}

          <CollapsibleSection
            {...sectionComfort}
            title={impegnoSectionTitle || 'Impegni'}
            count={impegnoCount}
            alwaysShow
            icon={impegnoSectionIcon}
            subtitle={impegnoSectionSubtitle}
            containerClassName={
              impegnoSectionUrgent
                ? `${AREA_SECTION_STYLE.impegno} ring-1 ring-indigo-200`
                : AREA_SECTION_STYLE.impegno
            }
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
            title={
              speseTotal > 0
                ? formatAmount(speseTotal)
                : formatAmount(0)
            }
            count={expenseCount}
            alwaysShow
            icon={speseSectionIcon}
            subtitle={
              expenseCount > 0
                ? `${expenseCount} ${expenseCount === 1 ? 'movimento' : 'movimenti'}`
                : 'Nessuna spesa'
            }
            containerClassName={AREA_SECTION_STYLE.spesa}
            onAdd={addInArea?.('expense')}
            onShare={expenseCount > 0 ? shareSectionExpenses : undefined}
            emptyContent={
              <EmptySectionHint label="spesa" onAdd={addInArea?.('expense')} />
            }
          >
            {expenseList}
          </CollapsibleSection>
        </div>
      ) : null}

      {!homeFeedQuiet && isEmpty && (
        <p className="py-4 text-center text-sm text-slate-400">
          Niente in questo mese. Aggiungi con{' '}
          <span className="font-semibold text-indigo-600">+</span>.
        </p>
      )}
    </div>
  )

  const renewalsDock =
    !homeFeedQuiet && urgentRenewals.length > 0 ? (
      <div className="shrink-0 border-t border-slate-200/80 bg-white/95 pt-3 backdrop-blur-sm">
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
                  showTypeLabel
                  event={event}
                  areaName={
                    areaSelection.kind === 'area'
                      ? undefined
                      : areaNameById(areas ?? [], event.areaId)
                  }
                  onEdit={() => onEditEvent(event)}
                />
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      </div>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col min-w-0">
      <div className="shrink-0">
        <AreaChips
          areas={areas ?? []}
          selection={areaSelection}
          onSelect={setAreaSelection}
          counts={areaCounts}
          totalCount={totalAreaItems}
          headerTrailing={<MiniMonthCalendar compact />}
          onAreaDeleted={(areaId) => {
            if (
              areaSelection.kind === 'area' &&
              areaSelection.areaId === areaId
            ) {
              setAreaSelection({ kind: 'all' })
            }
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{mainContent}</div>
      {renewalsDock}
    </div>
  )
}

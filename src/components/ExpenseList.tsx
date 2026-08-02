import { useMemo, useState } from 'react'
import { db, type Event, type Expense, type PaymentMethod } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import {
  currentMonthBounds,
  groupExpensesByMonth,
  monthKeyFromIso,
} from '../utils/monthFilter'
import { todayIso } from '../utils/countdown'
import { MonthExpenseSummary } from './MonthExpenseSummary'
import { PaymentOverview } from './PaymentOverview'
import { SearchBar } from './SearchBar'

interface ExpenseListProps {
  onEdit: (expense: Expense) => void
  onOpenEvent?: (event: Event) => void
}

export function ExpenseList({ onEdit, onOpenEvent }: ExpenseListProps) {
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | null>(null)
  const { label: monthLabel } = currentMonthBounds()
  const currentMonthKey = monthKeyFromIso(todayIso())

  const expenses = useDexieLiveQuery(
    () => db.expenses.orderBy('date').reverse().toArray(),
  )
  const events = useDexieLiveQuery(() => db.events.toArray())
  const areas = useDexieLiveQuery(() => db.areas.toArray())

  const query = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!expenses) return []
    let list = expenses
    if (methodFilter) {
      list = list.filter(
        (e) => (e.paymentMethod ?? 'altro') === methodFilter,
      )
    }
    if (!query) return list
    return list.filter(
      (e) =>
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query),
    )
  }, [expenses, query, methodFilter])

  const monthGroups = useMemo(
    () => groupExpensesByMonth(filtered),
    [filtered],
  )

  if (expenses === undefined) {
    return <p className="py-8 text-center text-sm text-slate-400">Caricamento...</p>
  }

  return (
    <div className="space-y-5">
      <PaymentOverview
        monthLabel={monthLabel}
        filterMethod={methodFilter}
        onFilterMethod={setMethodFilter}
      />

      {methodFilter && (
        <p className="text-center text-xs text-slate-500">
          Filtro attivo — tocca di nuovo il metodo per mostrare tutto
        </p>
      )}

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-slate-600">Nessuna spesa</p>
          <p className="mt-1 text-xs text-slate-400">
            Tocca <span className="font-medium">+</span> per aggiungere
          </p>
        </div>
      ) : (
        <>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Cerca spese, categorie..."
          />

          {monthGroups.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              {query
                ? `Nessun risultato per "${search}"`
                : 'Nessuna spesa con questo metodo di pagamento'}
            </p>
          ) : (
            <ul className="space-y-2">
              {monthGroups.map((group) => (
                <li key={group.key}>
                  <MonthExpenseSummary
                    monthLabel={group.label}
                    expenses={group.items}
                    events={events ?? []}
                    areas={areas ?? []}
                    onEdit={onEdit}
                    onOpenEvent={onOpenEvent}
                    defaultExpanded={group.key === currentMonthKey}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// Re-export per compatibilità con HomeView
export { ExpenseExpandableRow } from './ExpenseExpandableRow'

import { useMemo, useState } from 'react'
import { db, type Event, type Expense } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { groupExpensesByMonth } from '../utils/monthFilter'
import { MonthExpenseSummary } from './MonthExpenseSummary'
import { SearchBar } from './SearchBar'

interface ExpenseListProps {
  onEdit: (expense: Expense) => void
  onOpenEvent?: (event: Event) => void
}

export function ExpenseList({ onEdit, onOpenEvent }: ExpenseListProps) {
  const [search, setSearch] = useState('')

  const expenses = useDexieLiveQuery(
    () => db.expenses.orderBy('date').reverse().toArray(),
  )
  const areas = useDexieLiveQuery(() => db.areas.toArray())

  const query = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!expenses) return []
    if (!query) return expenses
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query),
    )
  }, [expenses, query])

  const monthGroups = useMemo(
    () => groupExpensesByMonth(filtered),
    [filtered],
  )

  if (expenses === undefined) {
    return <p className="py-8 text-center text-sm text-slate-400">Caricamento...</p>
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">Nessuna spesa</p>
        <p className="mt-1 text-xs text-slate-400">
          Tocca <span className="font-medium">+</span> per aggiungere
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Cerca spese, categorie..."
      />

      {monthGroups.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">
          Nessun risultato per &ldquo;{search}&rdquo;
        </p>
      ) : (
        <ul className="space-y-2">
          {monthGroups.map((group, index) => (
            <li key={group.key}>
              <MonthExpenseSummary
                monthLabel={group.label}
                expenses={group.items}
                areas={areas ?? []}
                onEdit={onEdit}
                onOpenEvent={onOpenEvent}
                defaultExpanded={index === 0}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Re-export per compatibilità con HomeView
export { ExpenseExpandableRow } from './ExpenseExpandableRow'

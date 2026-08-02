import {
  formatUpcomingExpenseLabel,
  type UpcomingMonthExpense,
} from '../utils/monthExpenseTotals'

interface UpcomingExpenseHintsProps {
  items: UpcomingMonthExpense[]
  className?: string
  align?: 'left' | 'right'
}

/** Righe «−30 € tra 3 giorni» per spese non ancora avvenute */
export function UpcomingExpenseHints({
  items,
  className = '',
  align = 'left',
}: UpcomingExpenseHintsProps) {
  if (items.length === 0) return null

  return (
    <div
      className={`space-y-0.5 ${align === 'right' ? 'text-right' : ''} ${className}`}
    >
      {items.map((item, i) => (
        <p
          key={`${item.date}-${item.amount}-${i}`}
          className="text-[11px] font-medium text-amber-700"
        >
          {formatUpcomingExpenseLabel(item.amount, item.daysUntil)}
        </p>
      ))}
    </div>
  )
}

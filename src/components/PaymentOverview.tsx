import {
  Banknote,
  Building2,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PaymentMethod } from '../db'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { formatAmount } from '../utils/format'
import {
  computeMonthPaidTotal,
} from '../utils/monthExpenseTotals'
import { expenseInCurrentMonth } from '../utils/monthFilter'
import {
  sumByPaymentMethod,
} from '../utils/paymentTotals'
import { MonthExpenseOverviewList } from './MonthExpenseOverviewList'
import { BankManager } from './BankManager'
import { CardManager } from './CardManager'

const METHOD_ICON: Record<
  PaymentMethod,
  { icon: typeof CreditCard; className: string }
> = {
  carta: { icon: CreditCard, className: 'bg-indigo-100 text-indigo-700' },
  bonifico: { icon: Building2, className: 'bg-sky-100 text-sky-700' },
  contanti: { icon: Banknote, className: 'bg-emerald-100 text-emerald-700' },
  altro: { icon: MoreHorizontal, className: 'bg-slate-100 text-slate-600' },
}

interface PaymentOverviewProps {
  monthLabel: string
  filterMethod: PaymentMethod | null
  onFilterMethod: (method: PaymentMethod | null) => void
}

export function PaymentOverview({
  monthLabel,
  filterMethod,
  onFilterMethod,
}: PaymentOverviewProps) {
  const [showCardForm, setShowCardForm] = useState(false)
  const [showBankForm, setShowBankForm] = useState(false)

  const expenses = useDexieLiveQuery(() => db.expenses.toArray())
  const events = useDexieLiveQuery(() => db.events.toArray())

  const methodTotals = useMemo(
    () => sumByPaymentMethod(expenses ?? [], events ?? [], true),
    [expenses, events],
  )

  const monthPaid = useMemo(
    () => computeMonthPaidTotal(expenses ?? []),
    [expenses],
  )

  const monthExpensesForList = useMemo(() => {
    let list = (expenses ?? []).filter(expenseInCurrentMonth)
    if (filterMethod) {
      list = list.filter(
        (e) => (e.paymentMethod ?? 'altro') === filterMethod,
      )
    }
    return list
  }, [expenses, filterMethod])

  const showCardManager =
    filterMethod === null || filterMethod === 'carta'
  const showBankManager = filterMethod === 'bonifico'

  if (expenses === undefined || events === undefined) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-rose-600 p-4 text-white shadow-md shadow-rose-200">
        <p className="text-xs font-medium text-rose-100 capitalize">
          Totale · {monthLabel}
        </p>
        <p className="text-2xl font-bold">{formatAmount(monthPaid)}</p>
        <MonthExpenseOverviewList expenses={monthExpensesForList} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {methodTotals.map(({ method, label, total: amount }) => {
          const { icon: Icon, className } = METHOD_ICON[method]
          const active = filterMethod === method
          return (
            <button
              key={method}
              type="button"
              onClick={() => onFilterMethod(active ? null : method)}
              className={`rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                active
                  ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                  : 'border-slate-100 bg-white shadow-sm hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${className}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p
                    className={`text-sm font-bold ${amount > 0 ? 'text-rose-600' : 'text-slate-400'}`}
                  >
                    {formatAmount(amount)}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {showCardManager && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Carte salvate
          </p>
          <CardManager
            monthOnly
            showForm={showCardForm}
            onShowFormChange={setShowCardForm}
          />
        </div>
      )}

      {showBankManager && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Banche salvate
          </p>
          <BankManager
            monthOnly
            showForm={showBankForm}
            onShowFormChange={setShowBankForm}
          />
        </div>
      )}
    </div>
  )
}

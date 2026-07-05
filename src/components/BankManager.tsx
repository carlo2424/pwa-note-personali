import { Building2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db, type PaymentCard } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { formatAmount } from '../utils/format'
import { filterPaymentAccounts } from '../utils/paymentAccounts'
import { cardBreakdowns } from '../utils/paymentTotals'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import { ExpandableCard } from './ExpandableCard'
import { ItemActions } from './ItemActions'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

interface BankManagerProps {
  monthOnly?: boolean
  showForm?: boolean
  onShowFormChange?: (open: boolean) => void
}

export function BankManager({
  monthOnly = false,
  showForm: controlledShowForm,
  onShowFormChange,
}: BankManagerProps) {
  const [internalShowForm, setInternalShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')

  const showForm = controlledShowForm ?? internalShowForm
  const setShowForm = onShowFormChange ?? setInternalShowForm

  const accounts = useDexieLiveQuery(() => db.paymentCards.toArray())
  const expenses = useDexieLiveQuery(() => db.expenses.toArray())
  const events = useDexieLiveQuery(() => db.events.toArray())

  const banks = useMemo(
    () => filterPaymentAccounts(accounts ?? [], 'bonifico'),
    [accounts],
  )

  const bankRows = useMemo(
    () => cardBreakdowns(banks, expenses ?? [], events ?? [], monthOnly),
    [banks, expenses, events, monthOnly],
  )

  function resetForm() {
    setName('')
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(bank: PaymentCard) {
    if (!bank.id) return
    setEditingId(bank.id)
    setName(bank.name)
    setShowForm(true)
  }

  async function saveBank() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const fields = {
      name: trimmedName,
      kind: 'bonifico' as const,
      digitsStart: '',
      digitsEnd: '',
      expiry: '',
    }
    if (editingId) {
      await db.paymentCards.update(editingId, fields)
    } else {
      await db.paymentCards.add({ ...fields, createdAt: Date.now() })
    }
    resetForm()
  }

  async function deleteBank(id: number) {
    if (!confirm('Eliminare questa banca?')) return
    await db.paymentCards.delete(id)
    if (editingId === id) resetForm()
  }

  if (accounts === undefined) {
    return null
  }

  return (
    <div className="space-y-2">
      {banks.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
          <Building2 className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
          <p className="text-xs text-slate-500">Nessuna banca salvata</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {bankRows.map(({ card, spese, eventi, total }) => (
            <li key={card.id}>
              <ExpandableCard
                compact
                comfortable
                containerClassName={ITEM_TYPE_STYLE.expense.card}
                icon={
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white text-sky-600">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                }
                title={card.name || 'Banca'}
                subtitle="Bonifico"
                trailing={
                  total > 0 ? (
                    <span className="text-xs font-bold text-rose-600">
                      {formatAmount(total)}
                    </span>
                  ) : undefined
                }
                actions={
                  <ItemActions
                    onEdit={() => startEdit(card)}
                    onDelete={() => card.id && deleteBank(card.id)}
                  />
                }
              >
                {total > 0 ? (
                  <div className="space-y-0.5 text-xs text-slate-600">
                    {spese > 0 && <p>Spese: {formatAmount(spese)}</p>}
                    {eventi > 0 && <p>Impegni: {formatAmount(eventi)}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    {monthOnly
                      ? 'Nessun movimento questo mese'
                      : 'Nessuna spesa registrata'}
                  </p>
                )}
              </ExpandableCard>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void saveBank()
          }}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <p className="text-sm font-semibold text-slate-800">
            {editingId ? 'Modifica banca' : 'Nuova banca'}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nome banca
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Intesa, UniCredit, Fineco"
              className={inputClass}
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-xl border py-2.5 text-sm text-slate-600"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white"
            >
              {editingId ? 'Salva' : 'Aggiungi'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Aggiungi banca
        </button>
      )}
    </div>
  )
}

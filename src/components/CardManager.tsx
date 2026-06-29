import { CreditCard, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { db, type PaymentCard } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { isCardExpired } from '../utils/countdown'
import { formatAmount } from '../utils/format'
import { cardBreakdowns } from '../utils/paymentTotals'
import { ExpandableCard } from './ExpandableCard'
import { ItemActions } from './ItemActions'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

function formatCardNumber(start: string, end: string): string {
  const s = (start || '••••').padEnd(4, '•').slice(0, 4)
  const e = (end || '••••').padEnd(4, '•').slice(0, 4)
  return `${s} •••• •••• ${e}`
}

interface CardManagerProps {
  monthOnly?: boolean
  showForm?: boolean
  onShowFormChange?: (open: boolean) => void
}

export function CardManager({
  monthOnly = false,
  showForm: controlledShowForm,
  onShowFormChange,
}: CardManagerProps) {
  const [internalShowForm, setInternalShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [digitsStart, setDigitsStart] = useState('')
  const [digitsEnd, setDigitsEnd] = useState('')
  const [expiry, setExpiry] = useState('')

  const showForm = controlledShowForm ?? internalShowForm
  const setShowForm = onShowFormChange ?? setInternalShowForm

  const cards = useDexieLiveQuery(() => db.paymentCards.toArray())
  const expenses = useDexieLiveQuery(() => db.expenses.toArray())
  const events = useDexieLiveQuery(() => db.events.toArray())

  const cardRows = useMemo(
    () => cardBreakdowns(cards ?? [], expenses ?? [], events ?? [], monthOnly),
    [cards, expenses, events, monthOnly],
  )

  function resetForm() {
    setName('')
    setDigitsStart('')
    setDigitsEnd('')
    setExpiry('')
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(card: PaymentCard) {
    if (!card.id) return
    setEditingId(card.id)
    setName(card.name)
    setDigitsStart(card.digitsStart)
    setDigitsEnd(card.digitsEnd)
    setExpiry(card.expiry)
    setShowForm(true)
  }

  async function saveCard() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const fields = {
      name: trimmedName,
      digitsStart: digitsStart.replace(/\D/g, '').slice(0, 4),
      digitsEnd: digitsEnd.replace(/\D/g, '').slice(0, 4),
      expiry: expiry.trim(),
    }
    if (editingId) {
      await db.paymentCards.update(editingId, fields)
    } else {
      await db.paymentCards.add({ ...fields, createdAt: Date.now() })
    }
    resetForm()
  }

  async function deleteCard(id: number) {
    if (!confirm('Eliminare questa carta?')) return
    await db.paymentCards.delete(id)
    if (editingId === id) resetForm()
  }

  if (cards === undefined) {
    return null
  }

  return (
    <div className="space-y-2">
      {cards.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
          <CreditCard className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
          <p className="text-xs text-slate-500">Nessuna carta salvata</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {cardRows.map(({ card, spese, eventi, total }) => {
            const expired = card.expiry ? isCardExpired(card.expiry) : false
            return (
              <li key={card.id}>
                <ExpandableCard
                  compact
                  comfortable
                  containerClassName={
                    expired
                      ? 'border-rose-200 bg-rose-50/50'
                      : 'border-slate-100 bg-white'
                  }
                  icon={
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <CreditCard className="h-3.5 w-3.5" />
                    </div>
                  }
                  title={card.name || 'Carta'}
                  subtitle={formatCardNumber(card.digitsStart, card.digitsEnd)}
                  trailing={
                    total > 0 ? (
                      <span className="text-xs font-bold text-rose-600">
                        {formatAmount(total)}
                      </span>
                    ) : undefined
                  }
                  badge={
                    expired ? (
                      <span className="rounded-full bg-rose-600 px-1.5 py-px text-[9px] font-bold text-white">
                        Scaduta
                      </span>
                    ) : undefined
                  }
                  actions={
                    <ItemActions
                      onEdit={() => startEdit(card)}
                      onDelete={() => card.id && deleteCard(card.id)}
                    />
                  }
                >
                  {card.expiry && (
                    <p
                      className={`text-xs ${expired ? 'text-rose-600' : 'text-slate-500'}`}
                    >
                      Scadenza {card.expiry}
                    </p>
                  )}
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
            )
          })}
        </ul>
      )}

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveCard()
          }}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <p className="text-sm font-semibold text-slate-800">
            {editingId ? 'Modifica carta' : 'Nuova carta'}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nome carta / banca
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Visa Intesa, Revolut"
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                4 cifre iniziali
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={digitsStart}
                onChange={(e) =>
                  setDigitsStart(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="4273"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                4 cifre finali
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={digitsEnd}
                onChange={(e) =>
                  setDigitsEnd(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="8912"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Scadenza
            </label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="MM/AA (es. 12/28)"
              className={inputClass}
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
          data-add-card
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Aggiungi carta
        </button>
      )}
    </div>
  )
}

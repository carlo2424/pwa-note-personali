import { CreditCard, Plus } from 'lucide-react'
import { useState } from 'react'
import { db, type PaymentCard } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { isCardExpired } from '../utils/countdown'
import { formatAmount } from '../utils/format'
import { ExpandableCard } from './ExpandableCard'
import { ItemActions } from './ItemActions'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

function formatCardNumber(start: string, end: string): string {
  const s = (start || '••••').padEnd(4, '•').slice(0, 4)
  const e = (end || '••••').padEnd(4, '•').slice(0, 4)
  return `${s} •••• •••• ${e}`
}

export function CardSummary() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [digitsStart, setDigitsStart] = useState('')
  const [digitsEnd, setDigitsEnd] = useState('')
  const [expiry, setExpiry] = useState('')

  const cards = useDexieLiveQuery(() => db.paymentCards.toArray())
  const expenses = useDexieLiveQuery(() => db.expenses.toArray())
  const events = useDexieLiveQuery(() => db.events.toArray())

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

  function cardTotal(cardId: number): { spese: number; eventi: number; totale: number } {
    const spese = (expenses ?? [])
      .filter((e) => e.cardId === cardId && e.amount > 0)
      .reduce((s, e) => s + e.amount, 0)
    const eventi = (events ?? [])
      .filter((e) => e.cardId === cardId && e.cost != null)
      .reduce((s, e) => s + (e.cost ?? 0), 0)
    return { spese, eventi, totale: spese + eventi }
  }

  const grandTotal = (cards ?? []).reduce((s, c) => s + cardTotal(c.id!).totale, 0)

  if (cards === undefined) {
    return <p className="py-8 text-center text-sm text-slate-400">Caricamento...</p>
  }

  return (
    <div className="space-y-4">
      {cards.length > 0 && (
        <div className="rounded-2xl bg-indigo-600 p-4 text-white shadow-md shadow-indigo-200">
          <p className="text-xs font-medium text-indigo-200">Totale su tutte le carte</p>
          <p className="text-2xl font-bold">{formatAmount(grandTotal)}</p>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-600">Nessuna carta salvata</p>
          <p className="mt-1 text-xs text-slate-400">
            Aggiungi un promemoria con nome, cifre e scadenza
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {cards.map((card: PaymentCard) => {
            const { spese, eventi, totale } = cardTotal(card.id!)
            const expired = card.expiry ? isCardExpired(card.expiry) : false
            return (
              <li key={card.id}>
                <ExpandableCard
                  containerClassName={
                    expired
                      ? 'border-rose-200 bg-rose-50/50 ring-1 ring-rose-100'
                      : 'border-slate-100 bg-white'
                  }
                  icon={
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <CreditCard className="h-4 w-4" />
                    </div>
                  }
                  title={card.name}
                  titleClassName={expired ? 'text-rose-900' : 'text-slate-900'}
                  subtitle={formatCardNumber(card.digitsStart, card.digitsEnd)}
                  badge={
                    expired ? (
                      <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Scaduta
                      </span>
                    ) : undefined
                  }
                  trailing={
                    totale > 0 ? (
                      <span className="shrink-0 text-xs font-semibold text-slate-700">
                        {formatAmount(totale)}
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
                      className={`text-xs ${expired ? 'font-semibold text-rose-600' : 'text-slate-500'}`}
                    >
                      {expired ? 'Scaduta · ' : 'Scadenza: '}
                      {card.expiry}
                    </p>
                  )}
                  {totale > 0 ? (
                    <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
                      {spese > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Spese registrate</span>
                          <span className="font-medium text-rose-600">
                            {formatAmount(spese)}
                          </span>
                        </div>
                      )}
                      {eventi > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Costi impegni / abbonamenti</span>
                          <span className="font-medium text-rose-600">
                            {formatAmount(eventi)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                        <span className="text-slate-700">Totale carta</span>
                        <span className="text-slate-900">{formatAmount(totale)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Nessuna spesa registrata su questa carta
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome carta / banca</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Es. Visa Intesa, Revolut" className={inputClass} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">4 cifre iniziali</label>
              <input type="text" inputMode="numeric" maxLength={4}
                value={digitsStart}
                onChange={(e) => setDigitsStart(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4273" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">4 cifre finali</label>
              <input type="text" inputMode="numeric" maxLength={4}
                value={digitsEnd}
                onChange={(e) => setDigitsEnd(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="8912" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Scadenza</label>
            <input type="text" value={expiry} onChange={(e) => setExpiry(e.target.value)}
              placeholder="MM/AA (es. 12/28)" className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={resetForm}
              className="flex-1 rounded-xl border py-2.5 text-sm text-slate-600">Annulla</button>
            <button type="submit"
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white">
              {editingId ? 'Salva' : 'Aggiungi'}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} data-add-card
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600">
          <Plus className="h-4 w-4" />
          Aggiungi carta
        </button>
      )}
    </div>
  )
}

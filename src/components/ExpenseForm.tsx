import { useState } from 'react'
import { PAYMENT_METHODS } from '../constants/events'
import { db, type Expense, type PaymentMethod } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { useDictationField } from '../hooks/useDictationField'
import { sentenceCase } from '../utils/format'
import { resolveAreaId, areaNameById } from '../utils/areas'
import { filterPaymentAccounts } from '../utils/paymentAccounts'
import { AreaInput } from './AreaInput'
import { SpeechDictation } from './SpeechDictation'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

const CATEGORIES = ['Cibo', 'Trasporti', 'Svago', 'Casa', 'Salute', 'Altro']

interface ExpenseFormProps {
  expense?: Expense
  defaultAreaName?: string
  onSave: () => void
  onClose: () => void
}

export function ExpenseForm({ expense, defaultAreaName, onSave, onClose }: ExpenseFormProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [description, setDescription] = useState(
    expense?.description ? sentenceCase(expense.description) : '',
  )
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : '',
  )
  const [category, setCategory] = useState(expense?.category ?? 'Cibo')
  const [date, setDate] = useState(expense?.date ?? today)
  const [isIncome, setIsIncome] = useState(expense ? expense.amount < 0 : false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    expense?.paymentMethod ?? 'carta',
  )
  const [cardId, setCardId] = useState(
    expense?.cardId ? String(expense.cardId) : '',
  )
  const cards = useDexieLiveQuery(() => db.paymentCards.toArray())
  const areas = useDexieLiveQuery(() => db.areas.toArray())

  const areaSyncKey = `${expense?.id ?? 'new'}:${expense?.areaId ?? ''}:${defaultAreaName ?? ''}:${(areas ?? []).map((a) => a.id).join(',')}`
  const [areaName, setAreaName] = useState('')
  const [prevAreaSyncKey, setPrevAreaSyncKey] = useState(areaSyncKey)
  if (areaSyncKey !== prevAreaSyncKey) {
    setPrevAreaSyncKey(areaSyncKey)
    if (expense?.id) {
      setAreaName(areaNameById(areas ?? [], expense.areaId) ?? '')
    } else {
      setAreaName(defaultAreaName ?? '')
    }
  }

  const [saving, setSaving] = useState(false)
  const descriptionDictation = useDictationField(setDescription)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!description.trim() || isNaN(parsed) || parsed <= 0) return

    setSaving(true)
    const now = Date.now()
    const areaId = await resolveAreaId(areaName)
    // Positivo = spesa, negativo = entrata
    const finalAmount = isIncome ? -parsed : parsed

    try {
      if (expense?.id) {
        await db.expenses.update(expense.id, {
          description: sentenceCase(description),
          amount: finalAmount,
          category,
          date,
          paymentMethod,
          cardId: cardId ? parseInt(cardId, 10) : undefined,
          areaId,
        })
      } else {
        await db.expenses.add({
          description: sentenceCase(description),
          amount: finalAmount,
          category,
          date,
          paymentMethod,
          cardId: cardId ? parseInt(cardId, 10) : undefined,
          areaId,
          createdAt: now,
        })
      }
      onSave()
      onClose()
    } catch (err) {
      console.error('Errore salvataggio spesa:', err)
      alert('Errore nel salvataggio della spesa.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsIncome(false)}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
            !isIncome
              ? 'bg-rose-100 text-rose-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          Spesa
        </button>
        <button
          type="button"
          onClick={() => setIsIncome(true)}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
            isIncome
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          Entrata
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-700">
            Descrizione
          </label>
          <SpeechDictation
            onTranscript={descriptionDictation.onTranscript}
            onListeningChange={descriptionDictation.onListeningChange}
            disabled={saving}
          />
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={(e) => setDescription(sentenceCase(e.target.value))}
          placeholder="Es. Pranzo, Benzina..."
          className={inputClass}
          required
        />
      </div>

      <AreaInput value={areaName} onChange={setAreaName} disabled={saving} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Importo (€)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Categoria
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Metodo pagamento
        </label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setPaymentMethod(m.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                paymentMethod === m.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === 'carta' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Carta utilizzata
          </label>
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Seleziona carta —</option>
            {filterPaymentAccounts(cards ?? [], 'carta').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {paymentMethod === 'bonifico' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Banca
          </label>
          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className={inputClass}
          >
            <option value="">— Seleziona banca —</option>
            {filterPaymentAccounts(cards ?? [], 'bonifico').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {filterPaymentAccounts(cards ?? [], 'bonifico').length === 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Aggiungi banche nella sezione Spese → Bonifico
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={saving || !description.trim() || !amount}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : expense ? 'Aggiorna' : 'Aggiungi'}
        </button>
      </div>
    </form>
  )
}

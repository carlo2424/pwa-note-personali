import { useEffect, useState } from 'react'
import { CalendarPlus, Check, Plus, X } from 'lucide-react'
import {
  EVENT_ICONS, PRESET_LABELS,
  PAYMENT_METHODS,
} from '../constants/events'
import { iconColorClass } from '../constants/itemColors'
import { db, type Event, type PaymentMethod, type RecurrenceFrequency } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { useDictationField } from '../hooks/useDictationField'
import { addToCalendar } from '../utils/calendar'
import { sentenceCase } from '../utils/format'
import { countdownLabel } from '../utils/countdown'
import { CameraCapture } from './CameraCapture'
import { EventIcon } from './EventIcon'
import { VoiceRecorder } from './VoiceRecorder'
import { SpeechDictation } from './SpeechDictation'
import { syncExpensesForEvent } from '../utils/eventExpenses'
import { syncTasksForEvent, type TodoInput } from '../utils/eventTasks'
import { resolveAreaId, areaNameById } from '../utils/areas'
import { filterPaymentAccounts } from '../utils/paymentAccounts'
import { RECURRENCE_OPTIONS, deriveImpegnoPeriodFields, computeDurationFromRange, computeEndDateFromDuration, clampEndDateToStart } from '../utils/recurring'
import { AreaInput } from './AreaInput'
import { IconColorPicker } from './IconColorPicker'

interface EventFormProps {
  event?: Event
  defaultAreaName?: string
  onSave: () => void
  onClose: () => void
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

export function EventForm({ event, defaultAreaName, onSave, onClose }: EventFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const cards = useDexieLiveQuery(() => db.paymentCards.toArray())

  const [title, setTitle] = useState(event?.title ? sentenceCase(event.title) : '')
  const [writtenNote, setWrittenNote] = useState(
    event?.writtenNote ? sentenceCase(event.writtenNote) : '',
  )
  const [labels, setLabels] = useState<string[]>(event?.labels ?? [])
  const [customLabel, setCustomLabel] = useState('')
  const [startDate, setStartDate] = useState(event?.startDate ?? today)
  const [endDate, setEndDate] = useState(event?.endDate ?? '')
  const [durationDays, setDurationDays] = useState(
    event?.durationDays ? String(event.durationDays) : '',
  )
  const [renewalDate, setRenewalDate] = useState(event?.renewalDate ?? '')
  const [renewalManual, setRenewalManual] = useState(!!event?.renewalDate)
  const [endManual, setEndManual] = useState(!!event?.endDate)
  const [durationManual, setDurationManual] = useState(!!event?.durationDays)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    RecurrenceFrequency | ''
  >(event?.recurrenceFrequency ?? '')
  const [color, setColor] = useState(event?.color ?? 'indigo')
  const [icon, setIcon] = useState(event?.icon ?? 'Calendar')
  const [cost, setCost] = useState(event?.cost ? String(event.cost) : '')
  const [received, setReceived] = useState(
    event?.received ? String(event.received) : '',
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    event?.paymentMethod ?? 'carta',
  )
  const [cardId, setCardId] = useState(
    event?.cardId ? String(event.cardId) : '',
  )
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(event?.photoBlob)
  const [voiceBlob, setVoiceBlob] = useState<Blob | undefined>(event?.voiceBlob)
  const [saving, setSaving] = useState(false)
  const writtenNoteDictation = useDictationField(setWrittenNote)
  const areas = useDexieLiveQuery(() => db.areas.toArray())

  const areaSyncKey = `${event?.id ?? 'new'}:${event?.areaId ?? ''}:${defaultAreaName ?? ''}:${(areas ?? []).map((a) => a.id).join(',')}`
  const [areaName, setAreaName] = useState('')
  const [prevAreaSyncKey, setPrevAreaSyncKey] = useState(areaSyncKey)
  if (areaSyncKey !== prevAreaSyncKey) {
    setPrevAreaSyncKey(areaSyncKey)
    if (event?.id) {
      setAreaName(areaNameById(areas ?? [], event.areaId) ?? '')
    } else {
      setAreaName(defaultAreaName ?? '')
    }
  }

  const todoEventId = event?.id
  const [loadedTodoEventId, setLoadedTodoEventId] = useState<number | undefined>(
    todoEventId,
  )
  const [todos, setTodos] = useState<TodoInput[]>([])
  if (todoEventId !== loadedTodoEventId) {
    setLoadedTodoEventId(todoEventId)
    setTodos([])
  }

  useEffect(() => {
    if (!todoEventId) return
    let cancelled = false
    db.tasks
      .where('eventId')
      .equals(todoEventId)
      .toArray()
      .then((tasks) => {
        if (cancelled) return
        setTodos(
          tasks.map((t) => ({
            id: t.id,
            title: t.title,
            done: t.done,
          })),
        )
      })
    return () => {
      cancelled = true
    }
  }, [todoEventId])

  const autoPeriodKey = [
    event?.id ?? 'new',
    event?.startDate ?? today,
    event?.recurrenceFrequency ?? '',
    event?.renewalDate ?? '',
    event?.endDate ?? '',
    event?.durationDays ?? '',
    durationDays,
  ].join('|')
  const [prevAutoPeriodKey, setPrevAutoPeriodKey] = useState('')
  if (autoPeriodKey !== prevAutoPeriodKey) {
    setPrevAutoPeriodKey(autoPeriodKey)
    const start = event?.startDate ?? today
    const freq = event?.recurrenceFrequency
    if (freq && start && !event?.renewalDate) {
      const patch = deriveImpegnoPeriodFields(start, freq, durationDays, {
        renewal: renewalManual,
        end: endManual,
        duration: durationManual,
      })
      if (patch.renewalDate) setRenewalDate(patch.renewalDate)
      if (patch.endDate && !event?.endDate) setEndDate(patch.endDate)
      if (patch.durationDays && !event?.durationDays) {
        setDurationDays(String(patch.durationDays))
      }
    }
  }

  function periodManual() {
    return {
      renewal: renewalManual,
      end: endManual,
      duration: durationManual,
    }
  }

  function applyDerivedPeriod(
    start: string,
    freq: RecurrenceFrequency | '',
    duration: string,
    manual = periodManual(),
  ) {
    const patch = deriveImpegnoPeriodFields(start, freq, duration, manual)
    if (patch.renewalDate !== undefined) setRenewalDate(patch.renewalDate)
    if (patch.endDate !== undefined) setEndDate(patch.endDate)
    if (patch.durationDays !== undefined) setDurationDays(patch.durationDays)
    if (!freq && !manual.renewal) setRenewalDate('')
  }

  function handleRecurrenceChange(freq: RecurrenceFrequency | '') {
    setRecurrenceFrequency(freq)
    applyDerivedPeriod(startDate, freq, durationDays)
  }

  function handleStartDateChange(date: string) {
    setStartDate(date)
    if (endDate && !endManual) {
      setEndDate(clampEndDateToStart(date, endDate))
    }
    applyDerivedPeriod(date, recurrenceFrequency, durationDays)
  }

  function handleEndDateChange(date: string) {
    setEndManual(true)
    const clamped = startDate ? clampEndDateToStart(startDate, date) : date
    setEndDate(clamped)
    if (!durationManual && startDate && clamped) {
      const days = computeDurationFromRange(startDate, clamped)
      if (days != null) setDurationDays(String(days))
    }
  }

  function handleDurationChange(value: string) {
    setDurationManual(true)
    setDurationDays(value)
    if (!endManual && startDate && value) {
      const parsed = parseInt(value, 10)
      if (!isNaN(parsed) && parsed > 0) {
        setEndDate(computeEndDateFromDuration(startDate, parsed))
      }
    }
  }

  function handleRenewalDateChange(date: string) {
    setRenewalDate(date)
    setRenewalManual(true)
  }

  function toggleLabel(label: string) {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  function addCustomLabel() {
    const trimmed = customLabel.trim()
    if (trimmed && !labels.includes(trimmed)) {
      const label = sentenceCase(trimmed)
      setLabels((prev) => (prev.includes(label) ? prev : [...prev, label]))
      setCustomLabel('')
    }
  }

  function addTodo() {
    setTodos((prev) => [...prev, { title: '', done: false }])
  }

  function updateTodo(index: number, patch: Partial<TodoInput>) {
    setTodos((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    )
  }

  function removeTodo(index: number) {
    setTodos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const parsedCost = cost ? parseFloat(cost.replace(',', '.')) : NaN
    const parsedReceived = received
      ? parseFloat(received.replace(',', '.'))
      : NaN
    const isImpegno = !!endDate

    if (!isImpegno) {
      if (event?.id) {
        alert(
          'Un impegno richiede data inizio e data fine.\n\n' +
            'Per una spesa una tantum archivia questo elemento e crea una «Spesa».',
        )
        return
      }

      if (!isNaN(parsedCost) && parsedCost > 0) {
        setSaving(true)
        const now = Date.now()
        const areaId = await resolveAreaId(areaName)
        try {
          await db.expenses.add({
            amount: parsedCost,
            description: sentenceCase(title),
            category: labels[0] || 'Altro',
            date: startDate,
            paymentMethod,
            cardId: cardId ? parseInt(cardId, 10) : undefined,
            areaId,
            createdAt: now,
          })
          if (!isNaN(parsedReceived) && parsedReceived > 0) {
            await db.expenses.add({
              amount: -parsedReceived,
              description: `${sentenceCase(title)} (ricevuto)`,
              category: 'Entrate',
              date: startDate,
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
          alert('Errore nel salvataggio. Riprova.')
        } finally {
          setSaving(false)
        }
        return
      }

      alert(
        'Un impegno richiede data inizio e data fine.\n\n' +
          'Per una spesa una tantum usa «Spesa» dal menu +, oppure inserisci l\'importo qui: verrà salvata come spesa.',
      )
      return
    }

    setSaving(true)
    const now = Date.now()
    const areaId = await resolveAreaId(areaName)

    const data: Omit<Event, 'id'> = {
      title: sentenceCase(title),
      writtenNote: sentenceCase(writtenNote),
      labels,
      startDate,
      endDate: endDate || undefined,
      durationDays: durationDays ? parseInt(durationDays, 10) : undefined,
      recurrenceFrequency: recurrenceFrequency || undefined,
      renewalDate: renewalDate || undefined,
      color,
      icon,
      cost: cost ? parseFloat(cost.replace(',', '.')) : undefined,
      received: received ? parseFloat(received.replace(',', '.')) : undefined,
      paymentMethod,
      cardId: cardId ? parseInt(cardId, 10) : undefined,
      areaId,
      photoBlob,
      voiceBlob,
      createdAt: event?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      if (event?.id) {
        await db.events.update(event.id, data)
        await syncExpensesForEvent(event.id, data)
        await syncTasksForEvent(event.id, todos)
      } else {
        const id = await db.events.add(data)
        if (id === undefined) throw new Error('Impossibile salvare impegno')
        await syncExpensesForEvent(id, data)
        await syncTasksForEvent(id, todos)
      }
      onSave()
      onClose()
    } catch (err) {
      console.error('Errore salvataggio impegno:', err)
      alert('Errore nel salvataggio. Ricarica la pagina e riprova.')
    } finally {
      setSaving(false)
    }
  }

  const previewEvent: Event = {
    title,
    writtenNote,
    labels,
    startDate,
    endDate,
    recurrenceFrequency: recurrenceFrequency || undefined,
    renewalDate,
    color,
    icon,
    paymentMethod,
    createdAt: 0,
    updatedAt: 0,
  }

  const isImpegnoPreview = !!endDate

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Titolo */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Titolo
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => setTitle(sentenceCase(e.target.value))}
          placeholder="Es. Netflix, Mutuo casa, Palestra"
          className={inputClass}
          required
        />
      </div>

      <AreaInput value={areaName} onChange={setAreaName} disabled={saving} />

      {/* Icona + Colore */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Icona
        </label>
        <div className="flex flex-wrap gap-2">
          {EVENT_ICONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setIcon(name)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                icon === name
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
              aria-label={name}
            >
              <EventIcon
                name={name}
                className={`h-4 w-4 ${
                  icon === name ? iconColorClass(color) : 'text-slate-400'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <IconColorPicker value={color} onChange={setColor} previewIcon={icon} />

      {/* Etichette */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Etichette
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleLabel(label)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                labels.includes(label)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Etichetta personalizzata"
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomLabel()
              }
            }}
          />
          <button
            type="button"
            onClick={addCustomLabel}
            className="shrink-0 rounded-xl bg-slate-100 px-3 text-sm font-medium text-slate-600"
          >
            +
          </button>
        </div>
      </div>

      {/* Ripetizione nel tempo */}
      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Periodo impegno
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Data inizio + data fine = impegno. La frequenza è opzionale (per
            abbonamenti che si ripetono). Senza data fine è una spesa una tantum
            — usa «Spesa».
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Frequenza ripetizione
          </label>
          <select
            value={recurrenceFrequency}
            onChange={(e) =>
              handleRecurrenceChange(e.target.value as RecurrenceFrequency | '')
            }
            className={inputClass}
          >
            <option value="">— Seleziona —</option>
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Data inizio</label>
            <input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">
              Data fine *
            </label>
            <input type="date" value={endDate} onChange={(e) => handleEndDateChange(e.target.value)} className={inputClass} min={startDate || undefined} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Durata (giorni)</label>
            <input
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => handleDurationChange(e.target.value)}
              placeholder="Opzionale"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Prossimo addebito</label>
            <input type="date" value={renewalDate} onChange={(e) => handleRenewalDateChange(e.target.value)} className={inputClass} />
          </div>
        </div>
        {renewalDate && (
          <p className="text-sm font-medium text-indigo-600">
            {countdownLabel(renewalDate)}
          </p>
        )}
        {!isImpegnoPreview && (cost || title.trim()) && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {!endDate
              ? 'Manca la data fine: con solo l\'importo verrà salvato come spesa una tantum.'
              : 'Impegno valido: periodo definito.'}
          </p>
        )}
        <button
          type="button"
          onClick={() => void addToCalendar(previewEvent)}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Aggiungi al calendario
        </button>
      </div>

      {/* Note scritte */}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-700">
            Note scritte
          </label>
          <SpeechDictation
            onTranscript={writtenNoteDictation.onTranscript}
            onListeningChange={writtenNoteDictation.onListeningChange}
            disabled={saving}
          />
        </div>
        <textarea
          value={writtenNote}
          onChange={(e) => setWrittenNote(e.target.value)}
          onBlur={(e) => setWrittenNote(sentenceCase(e.target.value))}
          placeholder="Dettagli, promemoria, codici..."
          rows={3}
          className={inputClass}
        />
      </div>

      {/* Attività da fare */}
      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Attività da fare
        </p>
        {todos.length > 0 && (
          <ul className="space-y-2">
            {todos.map((todo, index) => (
              <li key={todo.id ?? `new-${index}`} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateTodo(index, { done: !todo.done })}
                  aria-label={todo.done ? 'Segna come da fare' : 'Segna come completata'}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    todo.done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-white hover:border-indigo-400'
                  }`}
                >
                  {todo.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <input
                  type="text"
                  value={todo.title}
                  onChange={(e) => updateTodo(index, { title: e.target.value })}
                  onBlur={(e) =>
                    updateTodo(index, { title: sentenceCase(e.target.value) })
                  }
                  placeholder="Es. Rinnovare documenti, pagare bolletta..."
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeTodo(index)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-500"
                  aria-label="Rimuovi attività"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={addTodo}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Aggiungi attività
        </button>
        <p className="text-xs text-slate-400">
          Le attività appariranno nella Home con le checkbox.
        </p>
      </div>

      {/* Media */}
      <VoiceRecorder voiceBlob={voiceBlob} onRecord={setVoiceBlob} />
      <CameraCapture photo={photoBlob} onCapture={setPhotoBlob} />

      {/* Pagamenti */}
      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Costi e pagamenti
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Costo (€)</label>
            <input type="text" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="9,99" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Ricevuto (€)</label>
            <input type="text" inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0,00" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Metodo pagamento</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPaymentMethod(m.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  paymentMethod === m.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 shadow-sm'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {paymentMethod === 'carta' && (
          <div>
            <label className="mb-1 block text-xs text-slate-600">Carta utilizzata</label>
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
            {filterPaymentAccounts(cards ?? [], 'carta').length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Aggiungi carte nella sezione Spese
              </p>
            )}
          </div>
        )}
        {paymentMethod === 'bonifico' && (
          <div>
            <label className="mb-1 block text-xs text-slate-600">Banca</label>
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
                Aggiungi banche in Spese → Bonifico
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Annulla
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : event ? 'Aggiorna' : isImpegnoPreview ? 'Crea impegno' : 'Salva come spesa'}
        </button>
      </div>
    </form>
  )
}

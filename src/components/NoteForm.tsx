import { useEffect, useState } from 'react'
import { ListChecks, StickyNote } from 'lucide-react'
import { db, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { resolveAreaId, areaNameById } from '../utils/areas'
import { sentenceCase } from '../utils/format'
import { clampEndDateToStart } from '../utils/recurring'
import { EVENT_ICONS } from '../constants/events'
import { type NoteKind, resolveNoteKind } from '../utils/noteKind'
import { defaultNoteIcon } from '../utils/noteIcon'
import { syncChecklistForNote } from '../utils/noteTasks'
import { AreaInput } from './AreaInput'
import { CameraCapture } from './CameraCapture'
import { EventIcon } from './EventIcon'
import { SpeechDictation } from './SpeechDictation'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

const NOTE_COLORS = [
  { value: 'indigo', label: 'Indaco', class: 'bg-indigo-500' },
  { value: 'emerald', label: 'Verde', class: 'bg-emerald-500' },
  { value: 'amber', label: 'Ambra', class: 'bg-amber-500' },
  { value: 'rose', label: 'Rosa', class: 'bg-rose-500' },
  { value: 'slate', label: 'Grigio', class: 'bg-slate-400' },
]

interface NoteFormProps {
  note?: Note
  defaultKind?: NoteKind
  defaultAreaName?: string
  onSave: () => void
  onClose: () => void
}

function NoteKindToggle({
  kind,
  onChange,
  disabled,
}: {
  kind: NoteKind
  onChange: (kind: NoteKind) => void
  disabled?: boolean
}) {
  const options: { id: NoteKind; label: string; icon: typeof StickyNote }[] = [
    { id: 'text', label: 'Nota', icon: StickyNote },
    { id: 'checklist', label: 'Lista', icon: ListChecks },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const Icon = opt.icon
        const active = kind === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              active
                ? 'border-indigo-300 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function NoteForm({
  note,
  defaultKind = 'text',
  defaultAreaName,
  onSave,
  onClose,
}: NoteFormProps) {
  const [kind, setKind] = useState<NoteKind>(
    note ? resolveNoteKind(note) : defaultKind,
  )
  const [title, setTitle] = useState(note?.title ? sentenceCase(note.title) : '')
  const [content, setContent] = useState(
    note?.content ? sentenceCase(note.content) : '',
  )
  const [startDate, setStartDate] = useState(note?.startDate ?? '')
  const [endDate, setEndDate] = useState(note?.endDate ?? '')
  const [endManual, setEndManual] = useState(!!note?.endDate)
  const [color, setColor] = useState(note?.color ?? 'indigo')
  const [icon, setIcon] = useState(
    note?.icon ?? defaultNoteIcon(note ? resolveNoteKind(note) : defaultKind),
  )
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(note?.photoBlob)
  const [areaName, setAreaName] = useState('')
  const [saving, setSaving] = useState(false)

  const areas = useDexieLiveQuery(() => db.areas.toArray())
  const isChecklist = kind === 'checklist'

  useEffect(() => {
    if (note?.id) {
      setKind(resolveNoteKind(note))
      setIcon(note.icon ?? defaultNoteIcon(resolveNoteKind(note)))
      setAreaName(areaNameById(areas ?? [], note.areaId) ?? '')
    } else if (defaultAreaName) {
      setAreaName(defaultAreaName)
    }
  }, [note?.id, note?.areaId, note?.kind, note?.content, areas, defaultAreaName])

  useEffect(() => {
    if (!note?.id) setKind(defaultKind)
  }, [defaultKind, note?.id])

  function handleStartDateChange(date: string) {
    setStartDate(date)
    if (!date) {
      if (!endManual) setEndDate('')
      return
    }
    if (!endDate && !endManual) {
      setEndDate(date)
      return
    }
    if (!endManual) {
      setEndDate(clampEndDateToStart(date, endDate))
    }
  }

  function handleEndDateChange(date: string) {
    setEndManual(true)
    setEndDate(startDate ? clampEndDateToStart(startDate, date) : date)
  }

  function appendContent(text: string) {
    setContent((prev) =>
      sentenceCase(
        isChecklist
          ? prev
            ? `${prev.trimEnd()}\n${text}`
            : text
          : prev
            ? `${prev.trimEnd()} ${text}`
            : text,
      ),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    const now = Date.now()

    try {
      const areaId = await resolveAreaId(areaName)
      const fields = {
        title: sentenceCase(title),
        content: sentenceCase(content),
        kind,
        color,
        icon,
        photoBlob: isChecklist ? undefined : photoBlob,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        areaId,
        updatedAt: now,
      }

      if (note?.id) {
        await db.notes.update(note.id, fields)
        await syncChecklistForNote(note.id, content, kind)
      } else {
        const id = await db.notes.add({
          ...fields,
          createdAt: now,
        })
        if (id !== undefined) await syncChecklistForNote(id, content, kind)
      }
      onSave()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Tipo
        </label>
        <NoteKindToggle kind={kind} onChange={setKind} disabled={saving} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Titolo
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => setTitle(sentenceCase(e.target.value))}
          placeholder={isChecklist ? 'Titolo della lista' : 'Titolo della nota'}
          className={inputClass}
          required
        />
      </div>

      <AreaInput value={areaName} onChange={setAreaName} disabled={saving} />

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
              <EventIcon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">Data inizio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Data fine</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className={inputClass}
            min={startDate || undefined}
          />
        </div>
      </div>
      {startDate && endDate && (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          Con data inizio e fine {isChecklist ? 'questa lista' : 'questa nota'}{' '}
          compare anche tra gli <span className="font-semibold">Impegni</span>.
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-700">
            {isChecklist ? 'Voci' : 'Contenuto'}
          </label>
          <SpeechDictation onTranscript={appendContent} disabled={saving} />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={(e) => setContent(sentenceCase(e.target.value))}
          placeholder={
            isChecklist
              ? 'Una voce per riga, ad esempio:\nLatte\nPane\nUova'
              : 'Scrivi o detta a voce il testo della nota…'
          }
          rows={isChecklist ? 8 : 6}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">
          {isChecklist
            ? 'Ogni riga diventa una voce con spunta. Servono almeno 2 voci.'
            : 'Testo libero: anche più righe restano un appunto, senza spunte.'}
        </p>
      </div>

      {!isChecklist && (
        <CameraCapture photo={photoBlob} onCapture={setPhotoBlob} />
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Colore
        </label>
        <div className="flex gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`h-8 w-8 rounded-full ${c.class} transition ${
                color === c.value
                  ? 'ring-2 ring-offset-2 ring-indigo-400'
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={c.label}
            />
          ))}
        </div>
      </div>

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
          disabled={saving || !title.trim()}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving
            ? 'Salvataggio...'
            : note
              ? 'Aggiorna'
              : isChecklist
                ? 'Crea lista'
                : 'Crea nota'}
        </button>
      </div>
    </form>
  )
}

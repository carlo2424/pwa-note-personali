import { useEffect, useState } from 'react'
import { db, type Note } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { resolveAreaId, areaNameById } from '../utils/areas'
import { sentenceCase } from '../utils/format'
import { syncChecklistForNote } from '../utils/noteTasks'
import { AreaInput } from './AreaInput'
import { CameraCapture } from './CameraCapture'
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
  defaultAreaName?: string
  onSave: () => void
  onClose: () => void
}

export function NoteForm({ note, defaultAreaName, onSave, onClose }: NoteFormProps) {
  const [title, setTitle] = useState(note?.title ? sentenceCase(note.title) : '')
  const [content, setContent] = useState(
    note?.content ? sentenceCase(note.content) : '',
  )
  const [startDate, setStartDate] = useState(note?.startDate ?? '')
  const [endDate, setEndDate] = useState(note?.endDate ?? '')
  const [color, setColor] = useState(note?.color ?? 'indigo')
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(note?.photoBlob)
  const [areaName, setAreaName] = useState('')
  const [saving, setSaving] = useState(false)

  const areas = useDexieLiveQuery(() => db.areas.toArray())

  useEffect(() => {
    if (note?.id) {
      setAreaName(areaNameById(areas ?? [], note.areaId) ?? '')
    } else if (defaultAreaName) {
      setAreaName(defaultAreaName)
    }
  }, [note?.id, note?.areaId, areas, defaultAreaName])

  function appendContent(text: string) {
    setContent((prev) =>
      sentenceCase(prev ? `${prev.trimEnd()} ${text}` : text),
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
        color,
        photoBlob,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        areaId,
        updatedAt: now,
      }

      if (note?.id) {
        await db.notes.update(note.id, fields)
        await syncChecklistForNote(note.id, content)
      } else {
        const id = await db.notes.add({
          ...fields,
          createdAt: now,
        })
        if (id !== undefined) await syncChecklistForNote(id, content)
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
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Titolo
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => setTitle(sentenceCase(e.target.value))}
          placeholder="Titolo della nota"
          className={inputClass}
          required
        />
      </div>

      <AreaInput value={areaName} onChange={setAreaName} disabled={saving} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">Data inizio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Data fine</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      {startDate && endDate && (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          Con data inizio e fine questa nota compare anche tra gli{' '}
          <span className="font-semibold">Impegni</span>.
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-700">Contenuto</label>
          <SpeechDictation onTranscript={appendContent} disabled={saving} />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={(e) => setContent(sentenceCase(e.target.value))}
          placeholder={'Scrivi o detta a voce…\n\nLista della spesa:\nuna voce per riga\n(es. latte\npane\nuova)'}
          rows={6}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">
          Con <span className="font-medium text-slate-500">almeno 2 righe</span>{' '}
          nel contenuto compare una lista con spunte da segnare.
        </p>
      </div>

      <CameraCapture photo={photoBlob} onCapture={setPhotoBlob} />

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
          {saving ? 'Salvataggio...' : note ? 'Aggiorna' : 'Crea nota'}
        </button>
      </div>
    </form>
  )
}

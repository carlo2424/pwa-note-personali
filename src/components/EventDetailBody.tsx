import { Archive, CalendarPlus, Pencil } from 'lucide-react'
import { useState } from 'react'
import { db, type Event, type Task } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { addToCalendar } from '../utils/calendar'
import { archiveConfirmCopy } from '../utils/confirmMessages'
import { countdownLabel, countdownUrgency, isPastDue } from '../utils/countdown'
import { toggleTask } from '../utils/eventTasks'
import { archiveEvent } from '../utils/eventArchive'
import { formatAmount, formatIsoDate, sentenceCase } from '../utils/format'
import { recurrenceLabel, recurrenceShort } from '../utils/recurring'
import { shareEvent } from '../utils/share'
import { OVERDUE_ACCENT, taskAccentById } from '../constants/tasks'
import { ConfirmDialog } from './ConfirmDialog'
import { ShareButton } from './ShareButton'
import { TaskListCard } from './TaskListCard'

const URGENCY_STYLE = {
  expired: 'bg-rose-100 text-rose-700',
  today: 'bg-amber-100 text-amber-700',
  soon: 'bg-orange-100 text-orange-700',
  ok: 'bg-emerald-100 text-emerald-700',
}

interface EventDetailBodyProps {
  event: Event
  onEdit: () => void
  onArchived?: () => void
  areaName?: string
  compact?: boolean
}

export function EventDetailBody({
  event,
  onEdit,
  onArchived,
  areaName,
  compact = false,
}: EventDetailBodyProps) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const archiveCopy = archiveConfirmCopy('impegno', event.title)

  const photoUrl = event.photoBlob ? URL.createObjectURL(event.photoBlob) : null
  const audioUrl = event.voiceBlob ? URL.createObjectURL(event.voiceBlob) : null
  const eventTasks = useDexieLiveQuery<Task[]>(
    async () => {
      if (!event.id) return []
      return db.tasks.where('eventId').equals(event.id).toArray()
    },
    [event.id],
  )
  const todoTasks = eventTasks?.filter((t) => !t.done) ?? []
  const doneTasks = eventTasks?.filter((t) => t.done) ?? []
  const allTasks = [...todoTasks, ...doneTasks]
  const tasksOverdue = todoTasks.some((t) => isPastDue(t.dueDate))

  const taskAccent =
    tasksOverdue && event.id
      ? OVERDUE_ACCENT
      : event.id
        ? taskAccentById(event.id)
        : undefined

  const box = compact ? 'rounded-lg px-2.5 py-2 text-xs' : 'rounded-xl px-4 py-3 text-sm'
  const gap = compact ? 'space-y-2' : 'space-y-3'
  const btn = compact
    ? 'gap-1 rounded-lg py-1.5 text-[10px]'
    : 'gap-2 rounded-xl py-2 text-sm'
  const icon = compact ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <div className={gap}>
      {event.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {event.labels.map((l) => (
            <span
              key={l}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
            >
              {sentenceCase(l)}
            </span>
          ))}
        </div>
      )}

      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className={`w-full object-cover ${compact ? 'max-h-24 rounded-lg' : 'max-h-40 rounded-xl'}`}
        />
      )}

      {event.renewalDate && (
        <div
          className={`flex items-center gap-2 font-medium ${compact ? 'rounded-lg px-2 py-1.5 text-xs' : 'rounded-xl px-3 py-2 text-sm'} ${URGENCY_STYLE[countdownUrgency(event.renewalDate)]}`}
        >
          <span>{countdownLabel(event.renewalDate)}</span>
        </div>
      )}

      <div className={`bg-slate-50 space-y-1 ${box}`}>
        {event.recurrenceFrequency && (
          <div className="flex justify-between">
            <span className="text-slate-500">Ripetizione</span>
            <span className="font-medium text-slate-800">
              {recurrenceLabel(event.recurrenceFrequency)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Inizio</span>
          <span className="font-medium text-slate-800">
            {formatIsoDate(event.startDate)}
          </span>
        </div>
        {event.endDate && (
          <div className="flex justify-between">
            <span className="text-slate-500">Fine</span>
            <span className="font-medium text-slate-800">
              {formatIsoDate(event.endDate)}
            </span>
          </div>
        )}
        {event.durationDays && (
          <div className="flex justify-between">
            <span className="text-slate-500">Durata</span>
            <span className="font-medium text-slate-800">
              {event.durationDays} giorni
            </span>
          </div>
        )}
        {event.renewalDate && (
          <div className="flex justify-between">
            <span className="text-slate-500">Prossimo addebito</span>
            <span className="font-medium text-slate-800">
              {formatIsoDate(event.renewalDate)}
            </span>
          </div>
        )}
      </div>

      {(event.cost != null || event.received != null) && (
        <div className={`bg-slate-50 space-y-1 ${box}`}>
          {event.cost != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">
                Costo
                {event.recurrenceFrequency && recurrenceShort(event.recurrenceFrequency)
                  ? ` / ${recurrenceShort(event.recurrenceFrequency)}`
                  : ''}
              </span>
              <span className="font-semibold text-rose-600">
                −{formatAmount(event.cost)}
              </span>
            </div>
          )}
          {event.received != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ricevuto</span>
              <span className="font-semibold text-emerald-600">
                +{formatAmount(event.received)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-xs font-medium text-slate-600">
            <span>Metodo</span>
            <span className="capitalize">{event.paymentMethod}</span>
          </div>
        </div>
      )}

      {event.writtenNote && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Note
          </p>
          <p className={`whitespace-pre-wrap bg-slate-50 text-slate-700 ${compact ? 'rounded-lg px-2.5 py-2 text-xs' : 'rounded-xl px-4 py-3 text-sm'}`}>
            {sentenceCase(event.writtenNote)}
          </p>
        </div>
      )}

      {allTasks.length > 0 && (
        <TaskListCard
          title="Attività"
          tasks={allTasks}
          overdue={tasksOverdue}
          accent={taskAccent}
          onToggle={(id, done) => toggleTask(id, done)}
        />
      )}

      {audioUrl && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Nota vocale
          </p>
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}

      <ShareButton
        compact={compact}
        onClick={() => shareEvent(event, areaName)}
      />

      <button
        type="button"
        onClick={() => void addToCalendar(event)}
        className={`flex w-full items-center justify-center border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 ${compact ? 'gap-1 rounded-lg py-1.5 text-[10px]' : 'gap-1.5 rounded-xl py-2 text-xs'}`}
      >
        <CalendarPlus className="h-3.5 w-3.5" /> Aggiungi al calendario
      </button>

      <div className={`flex gap-2 border-t border-slate-100 ${compact ? 'pt-2' : 'pt-3'}`}>
        <button
          type="button"
          onClick={() => setShowArchiveConfirm(true)}
          className={`flex flex-1 items-center justify-center text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 ${btn}`}
        >
          <Archive className={icon} /> Archivia
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={`flex flex-1 items-center justify-center bg-indigo-600 font-medium text-white hover:bg-indigo-700 ${btn}`}
        >
          <Pencil className={icon} /> Modifica
        </button>
      </div>

      {showArchiveConfirm && (
        <ConfirmDialog
          title={archiveCopy.title}
          message={archiveCopy.message}
          confirmLabel={archiveCopy.confirmLabel}
          variant="danger"
          onConfirm={() => void archiveEvent(event, onArchived)}
          onClose={() => setShowArchiveConfirm(false)}
        />
      )}
    </div>
  )
}


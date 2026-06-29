import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import type { Note } from '../db'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { archiveConfirmCopy } from '../utils/confirmMessages'
import { isPastDue } from '../utils/countdown'
import { deadlineLabel, noteDateUrgency } from '../utils/homeSpotlight'
import { toggleTask } from '../utils/eventTasks'
import { formatDate, formatDateRange, sentenceCase } from '../utils/format'
import { isNoteImpegno } from '../utils/impegno'
import { isNoteChecklist } from '../utils/noteKind'
import { archiveNote } from '../utils/noteArchive'
import { shareNote } from '../utils/share'
import { ConfirmDialog } from './ConfirmDialog'
import { ExpandableCard } from './ExpandableCard'
import { ItemActions } from './ItemActions'
import { TaskRow } from './TaskRow'

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
}

interface NoteExpandableRowProps {
  note: Note
  onEdit: () => void
  areaName?: string
  compact?: boolean
  /** In Home globale: mostra l'area (es. Lorenzo) come titolo per le liste */
  promoteAreaTitle?: boolean
}

export function NoteExpandableRow({
  note,
  onEdit,
  areaName,
  compact = false,
  promoteAreaTitle = true,
}: NoteExpandableRowProps) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const archiveKind = isNoteImpegno(note) ? 'impegno' : 'nota'
  const archiveCopy = archiveConfirmCopy(archiveKind, note.title)
  const checklistNote = isNoteChecklist(note)

  const checklistTasks = useDexieLiveQuery(
    async () => {
      if (!note.id || !checklistNote) return []
      return db.tasks.where('noteId').equals(note.id).sortBy('createdAt')
    },
    [note.id, checklistNote],
  )

  const hasChecklist = checklistNote && (checklistTasks?.length ?? 0) > 0

  const displayContent =
    !checklistNote && note.content ? sentenceCase(note.content) : ''
  const photoUrl =
    !checklistNote && note.photoBlob
      ? URL.createObjectURL(note.photoBlob)
      : null
  const overdue = isPastDue(note.endDate)
  const dateRange = formatDateRange(note.startDate, note.endDate)

  const doneCount = checklistTasks?.filter((t) => t.done).length ?? 0
  const totalCount = checklistTasks?.length ?? 0

  const checklistPreview =
    hasChecklist && totalCount > 0
      ? `${doneCount}/${totalCount} completate`
      : checklistNote
        ? 'Lista vuota'
        : null

  const dateUrg = noteDateUrgency(note)
  const soon =
    dateUrg === 'today' || dateUrg === 'soon'
  const keyDate = note.endDate ?? note.startDate
  const soonLabel = keyDate ? deadlineLabel(keyDate) : ''

  const primaryTitle =
    checklistNote && areaName && promoteAreaTitle
      ? areaName
      : sentenceCase(note.title)

  const subtitleParts: string[] = []
  if (checklistNote && areaName && promoteAreaTitle) {
    subtitleParts.push(sentenceCase(note.title))
  }
  if (checklistPreview) subtitleParts.push(checklistPreview)
  if (soonLabel && (soon || overdue)) subtitleParts.push(soonLabel)
  if (!checklistNote && displayContent) {
    subtitleParts.push(
      `${displayContent.slice(0, 50)}${displayContent.length > 50 ? '…' : ''}`,
    )
  } else if (!checklistNote && dateRange) {
    subtitleParts.push(`${overdue ? 'Scaduta · ' : ''}${dateRange}`)
  } else if (!checklistNote && !displayContent && !dateRange) {
    subtitleParts.push(`Aggiornata ${formatDate(note.updatedAt)}`)
  }

  const resolvedSubtitle =
    subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined

  const typeBadge = checklistNote && !(areaName && promoteAreaTitle) ? (
    <span
      className={`shrink-0 rounded-full bg-emerald-100 font-semibold text-emerald-700 ${
        compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      Lista
    </span>
  ) : null

  return (
    <>
    <ExpandableCard
      compact={compact}
      containerClassName={
        overdue || dateUrg === 'expired'
          ? 'border-rose-200 bg-rose-50/50 ring-1 ring-rose-100'
          : soon
            ? 'border-amber-200 bg-amber-50/70 ring-1 ring-amber-100'
            : checklistNote
              ? 'border-emerald-100 bg-emerald-50/30'
              : 'border-slate-100 bg-white'
      }
      icon={
        checklistNote ? (
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ${
              compact ? 'h-6 w-6' : 'h-7 w-7'
            }`}
          >
            <ListChecks className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </div>
        ) : (
          <div
            className={`shrink-0 rounded-full ${COLOR_MAP[note.color ?? 'indigo']} ${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'}`}
          />
        )
      }
      title={primaryTitle}
      titleClassName={
        overdue || dateUrg === 'expired'
          ? 'text-rose-900'
          : soon
            ? 'text-amber-900'
            : 'text-slate-900'
      }
      subtitle={resolvedSubtitle}
      badge={
        overdue || dateUrg === 'expired' ? (
          <span className={`shrink-0 rounded-full bg-rose-600 font-bold text-white ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            Scaduta
          </span>
        ) : soon ? (
          <span className={`shrink-0 rounded-full bg-amber-500 font-bold text-white ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            {soonLabel === 'Oggi' ? 'Oggi' : 'Presto'}
          </span>
        ) : hasChecklist && totalCount > 0 && doneCount === totalCount ? (
          <span className={`shrink-0 rounded-full bg-emerald-100 font-semibold text-emerald-700 ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            Fatto
          </span>
        ) : (
          typeBadge
        )
      }
      actions={
        <ItemActions
          onEdit={onEdit}
          onShare={() => void shareNote(note, areaName)}
          onArchive={() => setShowArchiveConfirm(true)}
        />
      }
    >
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className={`w-full object-cover ${compact ? 'max-h-24 rounded-lg' : 'max-h-40 rounded-xl'}`}
        />
      )}
      {hasChecklist && checklistTasks && checklistTasks.length > 0 ? (
        <ul className={compact ? 'space-y-0.5' : 'space-y-1'}>
          {checklistTasks.map((task) =>
            task.id ? (
              <li key={task.id}>
                <TaskRow
                  compact={compact}
                  nested
                  done={task.done}
                  title={task.title}
                  onToggle={() => void toggleTask(task.id!, task.done)}
                />
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        displayContent && (
          <p className={`whitespace-pre-wrap text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            {displayContent}
          </p>
        )
      )}
      {dateRange && (
        <p
          className={`font-medium ${overdue ? 'text-rose-600' : 'text-indigo-600'} ${compact ? 'text-[10px]' : 'text-xs'}`}
        >
          {overdue ? 'Scaduta · ' : ''}
          {dateRange}
        </p>
      )}
      <p className={`text-slate-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        Aggiornata {formatDate(note.updatedAt)}
      </p>
    </ExpandableCard>

    {showArchiveConfirm && (
      <ConfirmDialog
        title={archiveCopy.title}
        message={archiveCopy.message}
        confirmLabel={archiveCopy.confirmLabel}
        variant="danger"
        onConfirm={() => void archiveNote(note)}
        onClose={() => setShowArchiveConfirm(false)}
      />
    )}
    </>
  )
}

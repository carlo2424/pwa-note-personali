import type { Note } from '../db'
import { db } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { isPastDue } from '../utils/countdown'
import { toggleTask } from '../utils/eventTasks'
import { formatDate, formatDateRange, sentenceCase } from '../utils/format'
import { isNoteChecklistContent } from '../utils/noteTasks'
import { archiveNote } from '../utils/noteArchive'
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
}

export function NoteExpandableRow({
  note,
  onEdit,
  areaName,
  compact = false,
}: NoteExpandableRowProps) {
  const checklistTasks = useDexieLiveQuery(
    async () => {
      if (!note.id) return []
      return db.tasks.where('noteId').equals(note.id).sortBy('createdAt')
    },
    [note.id],
  )

  const hasChecklist =
    (checklistTasks?.length ?? 0) >= 2 ||
    isNoteChecklistContent(note.content ?? '')

  const displayContent =
    !hasChecklist && note.content ? sentenceCase(note.content) : ''
  const photoUrl = note.photoBlob ? URL.createObjectURL(note.photoBlob) : null
  const overdue = isPastDue(note.endDate)
  const dateRange = formatDateRange(note.startDate, note.endDate)

  const doneCount = checklistTasks?.filter((t) => t.done).length ?? 0
  const totalCount = checklistTasks?.length ?? 0

  const checklistPreview =
    hasChecklist && totalCount > 0
      ? `${doneCount}/${totalCount} completate`
      : null

  return (
    <ExpandableCard
      compact={compact}
      containerClassName={
        overdue
          ? 'border-rose-200 bg-rose-50/50 ring-1 ring-rose-100'
          : 'border-slate-100 bg-white'
      }
      icon={
        <div
          className={`shrink-0 rounded-full ${COLOR_MAP[note.color ?? 'indigo']} ${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'}`}
        />
      }
      title={note.title}
      titleClassName={overdue ? 'text-rose-900' : 'text-slate-900'}
      subtitle={
        areaName
          ? `${areaName}${checklistPreview || displayContent || dateRange ? ' · ' : ''}${
              checklistPreview
                ? checklistPreview
                : displayContent
                  ? `${displayContent.slice(0, 50)}${displayContent.length > 50 ? '…' : ''}`
                  : dateRange
                    ? `${overdue ? 'Scaduta · ' : ''}${dateRange}`
                    : formatDate(note.updatedAt)
            }`
          : checklistPreview
            ? checklistPreview
            : displayContent
              ? `${displayContent.slice(0, 60)}${displayContent.length > 60 ? '…' : ''}`
              : dateRange
                ? `${overdue ? 'Scaduta · ' : ''}${dateRange}`
                : `Aggiornata ${formatDate(note.updatedAt)}`
      }
      badge={
        overdue ? (
          <span className={`shrink-0 rounded-full bg-rose-600 font-bold text-white ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            Scaduta
          </span>
        ) : hasChecklist && totalCount > 0 && doneCount === totalCount ? (
          <span className={`shrink-0 rounded-full bg-emerald-100 font-semibold text-emerald-700 ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            Fatto
          </span>
        ) : undefined
      }
      actions={
        <ItemActions onEdit={onEdit} onArchive={() => archiveNote(note)} />
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
  )
}

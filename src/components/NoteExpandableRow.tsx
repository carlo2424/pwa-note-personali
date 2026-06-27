import type { Note } from '../db'
import { isPastDue } from '../utils/countdown'
import { formatDate, formatDateRange, sentenceCase } from '../utils/format'
import { archiveNote } from '../utils/noteArchive'
import { ExpandableCard } from './ExpandableCard'
import { ItemActions } from './ItemActions'

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
  const displayContent = note.content ? sentenceCase(note.content) : ''
  const overdue = isPastDue(note.endDate)
  const dateRange = formatDateRange(note.startDate, note.endDate)

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
          ? `${areaName}${note.content || dateRange ? ' · ' : ''}${
              displayContent
                ? `${displayContent.slice(0, 50)}${displayContent.length > 50 ? '…' : ''}`
                : dateRange
                  ? `${overdue ? 'Scaduta · ' : ''}${dateRange}`
                  : formatDate(note.updatedAt)
            }`
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
        ) : undefined
      }
      actions={
        <ItemActions onEdit={onEdit} onArchive={() => archiveNote(note)} />
      }
    >
      {displayContent && (
        <p className={`whitespace-pre-wrap text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
          {displayContent}
        </p>
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

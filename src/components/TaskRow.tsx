import { Check } from 'lucide-react'
import { OVERDUE_ACCENT, type TaskAccent } from '../constants/tasks'
import { formatIsoDate, sentenceCase } from '../utils/format'
import { ItemActions } from './ItemActions'

interface TaskRowProps {
  done: boolean
  title: string
  subtitle?: string
  dueDate?: string
  onToggle: () => void
  onSubtitleClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  compact?: boolean
  nested?: boolean
  preview?: boolean
  overdue?: boolean
  accent?: TaskAccent
}

export function TaskRow({
  done,
  title,
  subtitle,
  dueDate,
  onToggle,
  onSubtitleClick,
  onEdit,
  onDelete,
  compact = false,
  nested = false,
  preview = false,
  overdue = false,
  accent,
}: TaskRowProps) {
  const style = overdue && !done && !preview ? OVERDUE_ACCENT : accent

  const checkbox = (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
        done
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : preview
            ? 'border-slate-300 bg-white'
            : style
              ? `${style.checkbox} bg-white`
              : 'border-slate-300 bg-white'
      }`}
    >
      {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  )

  return (
    <div
      className={`flex items-center gap-3 ${
        nested
          ? compact
            ? 'px-3 py-2'
            : 'px-3 py-2.5'
          : `rounded-xl border shadow-sm ${
              preview
                ? 'border-dashed border-slate-200 bg-slate-50/50'
                : style
                  ? `${style.border} ${style.bg}`
                  : 'border-slate-100 bg-white'
            } ${overdue && !nested && !preview ? 'ring-1 ring-rose-200' : ''} ${
              compact ? 'px-3 py-2' : 'p-3'
            }`
      }`}
    >
      {preview ? (
        checkbox
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={done ? 'Segna come da fare' : 'Segna come completata'}
          className="shrink-0"
        >
          {checkbox}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <span
          className={`block text-sm ${
            done
              ? 'text-slate-500 line-through'
              : overdue
                ? 'font-medium text-rose-800'
                : 'text-slate-800'
          }`}
        >
          {sentenceCase(title)}
        </span>
        {subtitle && (
          onSubtitleClick ? (
            <button
              type="button"
              onClick={onSubtitleClick}
              className="block truncate text-left text-xs text-indigo-500 hover:underline"
            >
              {subtitle}
            </button>
          ) : (
            <span className="block truncate text-xs text-slate-400">{subtitle}</span>
          )
        )}
        {overdue && !done && !nested && (
          <span className="mt-0.5 block text-[10px] font-semibold text-rose-600">
            Scaduta
          </span>
        )}
      </div>
      {dueDate && !nested && (
        <span
          className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold ${
            preview
              ? 'bg-slate-100 text-slate-600'
              : style
                ? style.badge
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {formatIsoDate(dueDate)}
        </span>
      )}
      {(onEdit || onDelete) && !preview && (
        <ItemActions onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  )
}

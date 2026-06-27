import { OVERDUE_ACCENT, type TaskAccent } from '../constants/tasks'
import { formatIsoDate, sentenceCase } from '../utils/format'
import { ItemActions } from './ItemActions'
import { TaskRow } from './TaskRow'
import type { Task } from '../db'

type ListTask = Pick<Task, 'id' | 'title' | 'done' | 'eventId'>

interface TaskListCardProps {
  title: string
  dueDate?: string
  tasks: ListTask[]
  preview?: boolean
  overdue?: boolean
  accent?: TaskAccent
  eventTitles?: Map<number, string>
  onToggle: (taskId: number, done: boolean) => void
  onEventClick?: (eventId: number) => void
  onEdit?: () => void
  onDelete?: () => void
}

export function TaskListCard({
  title,
  dueDate,
  tasks,
  preview = false,
  overdue = false,
  accent,
  eventTitles,
  onToggle,
  onEventClick,
  onEdit,
  onDelete,
}: TaskListCardProps) {
  const doneCount = tasks.filter((t) => t.done).length
  const style = overdue && !preview ? OVERDUE_ACCENT : accent

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        preview
          ? 'border-dashed border-slate-200 bg-slate-50/50'
          : style
            ? `${style.border} ${style.bg} shadow-sm`
            : 'border-slate-100 bg-white shadow-sm'
      } ${overdue && !preview ? 'ring-1 ring-rose-200' : ''}`}
    >
      <div
        className={`flex items-center gap-2 border-b px-3 py-2.5 ${
          preview
            ? 'border-slate-100'
            : style
              ? `${style.header} ${style.border}`
              : 'border-slate-100'
        }`}
      >
        <h4
          className={`min-w-0 flex-1 truncate text-sm font-semibold ${
            preview ? 'text-slate-700' : style ? style.title : 'text-slate-800'
          }`}
        >
          {sentenceCase(title)}
        </h4>
        {overdue && !preview && (
          <span className="shrink-0 rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
            In ritardo
          </span>
        )}
        {dueDate && (
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
        {!preview && tasks.length > 0 && (
          <span
            className={`shrink-0 text-[10px] font-medium ${
              overdue ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            {doneCount}/{tasks.length}
          </span>
        )}
        {(onEdit || onDelete) && !preview && (
          <ItemActions onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
      <ul className="divide-y divide-white/60">
        {tasks.map((task) => (
          <li key={task.id ?? `preview-${task.title}`}>
            <TaskRow
              nested
              preview={preview}
              done={task.done}
              title={task.title}
              overdue={overdue && !task.done}
              accent={preview ? undefined : style}
              subtitle={
                task.eventId ? eventTitles?.get(task.eventId) : undefined
              }
              onSubtitleClick={
                task.eventId && onEventClick
                  ? () => onEventClick(task.eventId!)
                  : undefined
              }
              onToggle={() => task.id && onToggle(task.id, task.done)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

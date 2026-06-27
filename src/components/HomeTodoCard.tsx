import { ListChecks } from 'lucide-react'
import type { Task, TaskList } from '../db'
import { OVERDUE_ACCENT, type TaskAccent } from '../constants/tasks'
import { formatIsoDate } from '../utils/format'
import { ExpandableCard } from './ExpandableCard'
import { ItemActions } from './ItemActions'
import { TaskRow } from './TaskRow'

type ListTask = Pick<Task, 'id' | 'title' | 'done' | 'eventId'>

function listContainerClass(overdue: boolean, accent?: TaskAccent) {
  if (overdue) return 'border-rose-200 bg-rose-50/40 ring-1 ring-rose-100'
  if (accent) return `${accent.border} ${accent.bg}`
  return 'border-slate-100 bg-white'
}

function taskIconClass(overdue: boolean, accent?: TaskAccent) {
  if (overdue) return 'bg-rose-100 text-rose-600'
  if (accent) return accent.badge
  return 'bg-emerald-100 text-emerald-600'
}

interface HomeTodoListCardProps {
  list: TaskList
  tasks: ListTask[]
  overdue?: boolean
  accent?: TaskAccent
  eventTitles?: Map<number, string>
  onToggle: (taskId: number, done: boolean) => void
  onEventClick?: (eventId: number) => void
  onEdit?: () => void
  onDelete?: () => void
}

export function HomeTodoListCard({
  list,
  tasks,
  overdue = false,
  accent,
  eventTitles,
  onToggle,
  onEventClick,
  onEdit,
  onDelete,
}: HomeTodoListCardProps) {
  const style = overdue ? OVERDUE_ACCENT : accent
  const pending = tasks.filter((t) => !t.done).length
  const doneCount = tasks.filter((t) => t.done).length

  return (
    <ExpandableCard
      containerClassName={listContainerClass(overdue, accent)}
      bodyClassName="p-0"
      icon={
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${taskIconClass(overdue, accent)}`}
        >
          <ListChecks className="h-4 w-4" />
        </div>
      }
      title={list.title}
      titleClassName={overdue ? 'text-rose-900' : 'text-slate-800'}
      subtitle={`${pending > 0 ? `${pending} da fare` : 'Completata'}${list.dueDate ? ` · ${formatIsoDate(list.dueDate)}` : ''}${tasks.length > 0 ? ` · ${doneCount}/${tasks.length}` : ''}`}
      badge={
        overdue ? (
          <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
            In ritardo
          </span>
        ) : undefined
      }
      actions={<ItemActions onEdit={onEdit} onDelete={onDelete} />}
    >
      <ul className="divide-y divide-white/60">
        {tasks.map((task) => (
          <li key={task.id ?? task.title}>
            <TaskRow
              nested
              done={task.done}
              title={task.title}
              overdue={overdue && !task.done}
              accent={style}
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
    </ExpandableCard>
  )
}

interface HomeTodoTaskCardProps {
  task: Task
  overdue?: boolean
  accent?: TaskAccent
  subtitle?: string
  onSubtitleClick?: () => void
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function HomeTodoTaskCard({
  task,
  overdue = false,
  accent,
  subtitle,
  onSubtitleClick,
  onToggle,
  onEdit,
  onDelete,
}: HomeTodoTaskCardProps) {
  const style = overdue ? OVERDUE_ACCENT : accent

  return (
    <ExpandableCard
      containerClassName={listContainerClass(overdue, accent)}
      bodyClassName="p-0"
      icon={
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${taskIconClass(overdue, accent)}`}
        >
          <ListChecks className="h-4 w-4" />
        </div>
      }
      title={task.title}
      titleClassName={
        task.done
          ? 'text-slate-500 line-through'
          : overdue
            ? 'text-rose-900'
            : 'text-slate-800'
      }
      subtitle={`${task.done ? 'Completata' : 'Attività singola'}${task.dueDate ? ` · ${formatIsoDate(task.dueDate)}` : ''}`}
      badge={
        overdue && !task.done ? (
          <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
            In ritardo
          </span>
        ) : undefined
      }
      actions={<ItemActions onEdit={onEdit} onDelete={onDelete} />}
    >
      <TaskRow
        nested
        done={task.done}
        title={task.title}
        overdue={overdue}
        accent={style}
        subtitle={subtitle}
        onSubtitleClick={onSubtitleClick}
        onToggle={onToggle}
      />
    </ExpandableCard>
  )
}

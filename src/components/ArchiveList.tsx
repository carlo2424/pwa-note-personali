import { RotateCcw, Trash2 } from 'lucide-react'
import { db, type ArchiveItem, type Expense, type Note, type Task } from '../db'
import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { formatDate } from '../utils/format'
import { syncExpensesForEvent } from '../utils/eventExpenses'
import type { SerializedEventData } from '../utils/archive'
import { ExpandableCard } from './ExpandableCard'

const TYPE_LABELS: Record<ArchiveItem['type'], string> = {
  note: 'Nota',
  expense: 'Spesa',
  event: 'Impegno',
  task: 'Attività',
}

const TYPE_STYLE: Record<ArchiveItem['type'], string> = {
  note: 'bg-indigo-100 text-indigo-700',
  expense: 'bg-rose-100 text-rose-700',
  event: 'bg-violet-100 text-violet-700',
  task: 'bg-emerald-100 text-emerald-700',
}

async function restoreItem(item: ArchiveItem) {
  const parsed = JSON.parse(item.data)

  if (item.type === 'note') {
    const note = parsed as Note
    await db.notes.add({
      title: note.title,
      content: note.content,
      color: note.color,
      startDate: note.startDate,
      endDate: note.endDate,
      areaId: note.areaId,
      createdAt: note.createdAt,
      updatedAt: Date.now(),
    })
  } else if (item.type === 'expense') {
    const expense = parsed as Expense
    await db.expenses.add({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      cardId: expense.cardId,
      areaId: expense.areaId,
      createdAt: expense.createdAt,
    })
  } else if (item.type === 'event') {
    const eventData = parsed as SerializedEventData
    const { linkedTasks, ...eventFields } = eventData
    const newId = await db.events.add({
      title: eventFields.title,
      writtenNote: eventFields.writtenNote ?? '',
      labels: eventFields.labels ?? [],
      startDate: eventFields.startDate,
      endDate: eventFields.endDate,
      durationDays: eventFields.durationDays,
      recurrenceFrequency: eventFields.recurrenceFrequency,
      renewalDate: eventFields.renewalDate,
      color: eventFields.color,
      icon: eventFields.icon,
      cost: eventFields.cost,
      received: eventFields.received,
      paymentMethod: eventFields.paymentMethod,
      cardId: eventFields.cardId,
      areaId: eventFields.areaId,
      photoBlob: item.photoBlob,
      voiceBlob: item.voiceBlob,
      createdAt: eventFields.createdAt,
      updatedAt: Date.now(),
    })
    if (newId === undefined) throw new Error('Impossibile ripristinare impegno')
    await syncExpensesForEvent(newId, {
      ...eventFields,
      writtenNote: eventFields.writtenNote ?? '',
      labels: eventFields.labels ?? [],
    })
    for (const task of linkedTasks ?? []) {
      await db.tasks.add({
        ...task,
        eventId: newId,
      })
    }
  } else if (item.type === 'task') {
    const task = parsed as Task
    await db.tasks.add({
      title: task.title,
      done: task.done,
      eventId: task.eventId,
      listId: task.listId,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    })
  }

  if (item.id) await db.archive.delete(item.id)
}

async function deletePermanently(item: ArchiveItem) {
  if (item.id) await db.archive.delete(item.id)
}

export function ArchiveList() {
  const items = useDexieLiveQuery(async () => {
    const all = await db.archive.toArray()
    return all.sort((a, b) => b.archivedAt - a.archivedAt)
  })

  if (items === undefined) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">Caricamento...</p>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">Archivio vuoto</p>
        <p className="mt-1 text-xs text-slate-400">
          Gli elementi archiviati appariranno qui
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <ExpandableCard
            icon={
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${TYPE_STYLE[item.type]}`}
              >
                {TYPE_LABELS[item.type].slice(0, 1)}
              </span>
            }
            title={item.title}
            subtitle={`${TYPE_LABELS[item.type]} · ${formatDate(item.archivedAt)}`}
          >
            <p className="text-xs text-slate-500">
              Archiviato il {formatDate(item.archivedAt)}
            </p>
            <div className="flex gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => restoreItem(item)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <RotateCcw className="h-4 w-4" /> Ripristina
              </button>
              <button
                type="button"
                onClick={() => deletePermanently(item)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="h-4 w-4" /> Elimina
              </button>
            </div>
          </ExpandableCard>
        </li>
      ))}
    </ul>
  )
}

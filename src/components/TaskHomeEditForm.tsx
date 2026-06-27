import { useState } from 'react'
import type { Task, TaskList } from '../db'
import { sentenceCase } from '../utils/format'
import {
  parseTaskLines,
  updateStandaloneTask,
  updateTaskList,
} from '../utils/eventTasks'

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

interface TaskItemEditFormProps {
  task: Task
  onSave: () => void
  onClose: () => void
}

export function TaskItemEditForm({ task, onSave, onClose }: TaskItemEditFormProps) {
  const [title, setTitle] = useState(sentenceCase(task.title))
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !task.id) return
    setSaving(true)
    try {
      await updateStandaloneTask(task.id, title, dueDate || undefined)
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
          Attività
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => setTitle(sentenceCase(e.target.value))}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-600">Data</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
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
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </form>
  )
}

interface TaskListEditFormProps {
  list: TaskList
  tasks: Task[]
  onSave: () => void
  onClose: () => void
}

export function TaskListEditForm({
  list,
  tasks,
  onSave,
  onClose,
}: TaskListEditFormProps) {
  const doneCount = tasks.filter((t) => t.done).length

  const [title, setTitle] = useState(sentenceCase(list.title))
  const [dueDate, setDueDate] = useState(list.dueDate ?? '')
  const [itemsText, setItemsText] = useState(
    tasks
      .filter((t) => !t.done)
      .map((t) => sentenceCase(t.title))
      .join('\n'),
  )
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !list.id) return
    const lines = parseTaskLines(itemsText)
    if (lines.length === 0 && doneCount === 0) return

    setSaving(true)
    try {
      await updateTaskList(list.id, title, dueDate || undefined, lines)
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
          Nome lista
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => setTitle(sentenceCase(e.target.value))}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-600">Data</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Voci da fare
        </label>
        <textarea
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          onBlur={(e) => setItemsText(sentenceCase(e.target.value))}
          rows={5}
          placeholder="Una voce per riga…"
          className={`${inputClass} resize-none`}
        />
        {doneCount > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            {doneCount} voci già completate non modificate qui.
          </p>
        )}
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
          disabled={
            saving ||
            !title.trim() ||
            (parseTaskLines(itemsText).length === 0 && doneCount === 0)
          }
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </form>
  )
}

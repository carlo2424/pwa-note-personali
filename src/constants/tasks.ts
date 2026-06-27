/** Palette rotante per evidenziare liste e attività singole */
export const TASK_ACCENT_COLORS = [
  {
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    header: 'bg-indigo-50/80',
    title: 'text-indigo-900',
    badge: 'bg-indigo-100 text-indigo-700',
    checkbox: 'border-indigo-400',
  },
  {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    header: 'bg-emerald-50/80',
    title: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-700',
    checkbox: 'border-emerald-400',
  },
  {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    header: 'bg-amber-50/80',
    title: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-700',
    checkbox: 'border-amber-400',
  },
  {
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    header: 'bg-rose-50/80',
    title: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-700',
    checkbox: 'border-rose-400',
  },
  {
    border: 'border-violet-200',
    bg: 'bg-violet-50',
    header: 'bg-violet-50/80',
    title: 'text-violet-900',
    badge: 'bg-violet-100 text-violet-700',
    checkbox: 'border-violet-400',
  },
] as const

export type TaskAccent = (typeof TASK_ACCENT_COLORS)[number]

export function taskAccentById(id: number): TaskAccent {
  return TASK_ACCENT_COLORS[Math.abs(id) % TASK_ACCENT_COLORS.length]
}

/** Evidenziazione attività/liste scadute e non completate */
export const OVERDUE_ACCENT: TaskAccent = {
  border: 'border-rose-200',
  bg: 'bg-rose-50',
  header: 'bg-rose-50/80',
  title: 'text-rose-900',
  badge: 'bg-rose-100 text-rose-700',
  checkbox: 'border-rose-400',
}

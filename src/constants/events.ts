export const EVENT_COLORS = [
  { value: 'indigo', class: 'bg-indigo-500', ring: 'ring-indigo-400' },
  { value: 'emerald', class: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { value: 'amber', class: 'bg-amber-500', ring: 'ring-amber-400' },
  { value: 'rose', class: 'bg-rose-500', ring: 'ring-rose-400' },
  { value: 'sky', class: 'bg-sky-500', ring: 'ring-sky-400' },
  { value: 'violet', class: 'bg-violet-500', ring: 'ring-violet-400' },
]

export const EVENT_ICONS = [
  'Calendar', 'CreditCard', 'Music', 'Tv', 'Wifi', 'Car',
  'Home', 'Heart', 'Smartphone', 'Dumbbell', 'BookOpen', 'Cloud',
] as const

export type EventIconName = (typeof EVENT_ICONS)[number]

export const PRESET_LABELS = [
  'Abbonamenti', 'Streaming', 'Fitness', 'Assicurazione',
  'Utilità', 'Software', 'Telefonia', 'Altro',
]

export const PAYMENT_METHODS = [
  { value: 'carta', label: 'Carta' },
  { value: 'bonifico', label: 'Bonifico' },
  { value: 'contanti', label: 'Contanti' },
  { value: 'altro', label: 'Altro' },
] as const

export const COLOR_CLASS: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
}

export const COLOR_ICON_BG: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
  sky: 'bg-sky-100 text-sky-600',
  violet: 'bg-violet-100 text-violet-600',
}

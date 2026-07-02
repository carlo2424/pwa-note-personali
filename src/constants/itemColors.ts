/** Stili per tipo di elemento: card, sezioni Home, navigazione */

export const ITEM_TYPE_STYLE = {
  note: {
    /** Note testuali: giallo chiaro, stesso tono dell'icona "Nota" nel menu + */
    card: 'border-amber-200 bg-amber-100',
    /** Liste to-do: giallo più scuro per distinguerle dalle note testuali */
    cardChecklist: 'border-amber-300 bg-amber-200',
    /** Scadenza vicina: arancio, si distingue dal giallo di base */
    cardSoon: 'border-orange-300 bg-orange-100 ring-1 ring-orange-200',
    cardExpired: 'border-rose-300 bg-rose-100 ring-1 ring-rose-200',
    section: 'border-amber-200/90 bg-amber-50/90 ring-1 ring-amber-100 shadow-sm',
    navActive: 'text-amber-600',
    navIconBg: 'bg-amber-100 text-amber-700',
  },
  event: {
    /** Stesso violetto dell'icona "Impegno" nel menu + */
    card: 'border-violet-200 bg-violet-100',
    section: 'border-violet-200/90 bg-violet-50/80 ring-1 ring-violet-100 shadow-sm',
    navActive: 'text-violet-600',
    navIconBg: 'bg-violet-100 text-violet-700',
  },
  expense: {
    card: 'border-rose-100 bg-rose-50/40',
    section: 'border-rose-200/90 bg-rose-50/80 ring-1 ring-rose-100 shadow-sm',
    navActive: 'text-rose-600',
    navIconBg: 'bg-rose-100 text-rose-700',
  },
  home: {
    navActive: 'text-emerald-600',
    navIconBg: 'bg-emerald-100 text-emerald-700',
  },
  archive: {
    navActive: 'text-slate-600',
    navIconBg: 'bg-slate-100 text-slate-600',
  },
} as const

/** Palette ridotta: colore scelto dall'utente per l'icona */
export const ICON_COLOR_OPTIONS = [
  { value: 'indigo', label: 'Blu', swatch: 'bg-indigo-500', ring: 'ring-indigo-400' },
  { value: 'emerald', label: 'Verde', swatch: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { value: 'amber', label: 'Giallo', swatch: 'bg-amber-500', ring: 'ring-amber-400' },
  { value: 'rose', label: 'Rosa', swatch: 'bg-rose-500', ring: 'ring-rose-400' },
] as const

export type IconColorName = (typeof ICON_COLOR_OPTIONS)[number]['value']

const ICON_TEXT: Record<string, string> = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  sky: 'text-sky-600',
  violet: 'text-violet-600',
  slate: 'text-slate-600',
}

export function iconColorClass(color?: string | null): string {
  return ICON_TEXT[color ?? ''] ?? ICON_TEXT.indigo
}

export const NAV_SECTION_STYLE: Record<
  'home' | 'notes' | 'events' | 'expenses' | 'archive',
  { active: string; inactive: string }
> = {
  home: { active: ITEM_TYPE_STYLE.home.navActive, inactive: 'text-slate-400' },
  notes: { active: ITEM_TYPE_STYLE.note.navActive, inactive: 'text-slate-400' },
  events: { active: ITEM_TYPE_STYLE.event.navActive, inactive: 'text-slate-400' },
  expenses: { active: ITEM_TYPE_STYLE.expense.navActive, inactive: 'text-slate-400' },
  archive: { active: ITEM_TYPE_STYLE.archive.navActive, inactive: 'text-slate-400' },
}

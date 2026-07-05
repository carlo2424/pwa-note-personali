import type { EventIconName } from '../constants/events'

const ICON_NAMES = new Set<EventIconName>([
  'Calendar',
  'CreditCard',
  'Music',
  'Tv',
  'Wifi',
  'Car',
  'Home',
  'Heart',
  'Smartphone',
  'Dumbbell',
  'BookOpen',
  'Cloud',
  'StickyNote',
  'ListChecks',
])

const ICON_ALIASES: Record<string, EventIconName> = {
  casa: 'Home',
  home: 'Home',
  calendario: 'Calendar',
  calendar: 'Calendar',
  carta: 'CreditCard',
  creditcard: 'CreditCard',
  auto: 'Car',
  car: 'Car',
  cuore: 'Heart',
  heart: 'Heart',
  telefono: 'Smartphone',
  smartphone: 'Smartphone',
  wifi: 'Wifi',
  tv: 'Tv',
  musica: 'Music',
  music: 'Music',
  nuvola: 'Cloud',
  cloud: 'Cloud',
  libro: 'BookOpen',
  bookopen: 'BookOpen',
  palestra: 'Dumbbell',
  dumbbell: 'Dumbbell',
  nota: 'StickyNote',
  stickynote: 'StickyNote',
  lista: 'ListChecks',
  listchecks: 'ListChecks',
}

export function resolveIconName(name: string | undefined | null): EventIconName {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return 'Calendar'
  if (ICON_NAMES.has(trimmed as EventIconName)) return trimmed as EventIconName
  const alias = ICON_ALIASES[trimmed.toLowerCase()]
  if (alias) return alias
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  if (ICON_NAMES.has(capitalized as EventIconName)) return capitalized as EventIconName
  return 'Calendar'
}

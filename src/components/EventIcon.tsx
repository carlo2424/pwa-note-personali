import {
  BookOpen, Calendar, Car, Cloud, CreditCard, Dumbbell, Heart,
  Home, ListChecks, Music, Smartphone, StickyNote, Tv, Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { EventIconName } from '../constants/events'

const ICON_MAP: Record<EventIconName, LucideIcon> = {
  Calendar,
  CreditCard,
  Music,
  Tv,
  Wifi,
  Car,
  Home,
  Heart,
  Smartphone,
  Dumbbell,
  BookOpen,
  Cloud,
  StickyNote,
  ListChecks,
}

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
  if (trimmed in ICON_MAP) return trimmed as EventIconName
  const alias = ICON_ALIASES[trimmed.toLowerCase()]
  if (alias) return alias
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  if (capitalized in ICON_MAP) return capitalized as EventIconName
  return 'Calendar'
}

export function EventIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: string
  className?: string
}) {
  const Icon = ICON_MAP[resolveIconName(name)]
  return <Icon className={className} />
}

export { ICON_MAP }

import {
  BookOpen, Calendar, Car, Cloud, CreditCard, Dumbbell, Heart,
  Home, ListChecks, Music, Smartphone, StickyNote, Tv, Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { EventIconName } from '../constants/events'
import { resolveIconName } from '../utils/resolveEventIconName'

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

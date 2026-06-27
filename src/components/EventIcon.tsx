import {
  BookOpen, Calendar, Car, Cloud, CreditCard, Dumbbell, Heart,
  Home, Music, Smartphone, Tv, Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { EventIconName } from '../constants/events'

const ICON_MAP: Record<EventIconName, LucideIcon> = {
  Calendar, CreditCard, Music, Tv, Wifi, Car,
  Home, Heart, Smartphone, Dumbbell, BookOpen, Cloud,
}

export function EventIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: string
  className?: string
}) {
  const Icon = ICON_MAP[name as EventIconName] ?? Calendar
  return <Icon className={className} />
}

export { ICON_MAP }

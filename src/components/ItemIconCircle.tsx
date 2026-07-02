import { iconColorClass } from '../constants/itemColors'
import { EventIcon } from './EventIcon'

interface ItemIconCircleProps {
  icon: string
  color?: string
  compact?: boolean
}

/** Badge icona: sfondo neutro, colore utente solo sull'icona */
export function ItemIconCircle({
  icon,
  color = 'indigo',
  compact = false,
}: ItemIconCircleProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white ${
        compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl'
      }`}
    >
      <EventIcon
        name={icon}
        className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${iconColorClass(color)}`}
      />
    </div>
  )
}

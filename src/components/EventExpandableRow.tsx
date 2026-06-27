import { COLOR_ICON_BG } from '../constants/events'
import type { Event } from '../db'
import { countdownLabel, countdownUrgency } from '../utils/countdown'
import { formatAmount, formatIsoDate } from '../utils/format'
import { recurrenceShort } from '../utils/recurring'
import { EventDetailBody } from './EventDetailBody'
import { EventIcon } from './EventIcon'
import { ExpandableCard } from './ExpandableCard'

const URGENCY_BADGE = {
  expired: 'bg-rose-100 text-rose-700',
  today: 'bg-amber-100 text-amber-700',
  soon: 'bg-orange-100 text-orange-700',
  ok: 'bg-emerald-100 text-emerald-700',
}

interface EventExpandableRowProps {
  event: Event
  onEdit: () => void
  onArchived?: () => void
  todoCount?: number
  containerClassName?: string
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  areaName?: string
  compact?: boolean
}

export function EventExpandableRow({
  event,
  onEdit,
  onArchived,
  todoCount = 0,
  containerClassName = 'border-slate-100 bg-white',
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  areaName,
  compact = false,
}: EventExpandableRowProps) {
  const freqShort = recurrenceShort(event.recurrenceFrequency)
  const meta = `${freqShort ? `${freqShort} · ` : ''}${formatIsoDate(event.startDate)}${event.endDate ? ` → ${formatIsoDate(event.endDate)}` : ''}${event.labels.length > 0 ? ` · ${event.labels[0]}` : ''}${todoCount > 0 ? ` · ${todoCount} da fare` : ''}`

  return (
    <ExpandableCard
      compact={compact}
      containerClassName={containerClassName}
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      icon={
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg ${COLOR_ICON_BG[event.color] ?? COLOR_ICON_BG.indigo} ${compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl'}`}
        >
          <EventIcon name={event.icon} className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </div>
      }
      title={event.title}
      subtitle={areaName ? `${areaName} · ${meta}` : meta}
      badge={
        event.renewalDate ? (
          <span
            className={`shrink-0 rounded-full font-medium ${URGENCY_BADGE[countdownUrgency(event.renewalDate)]} ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
          >
            {countdownLabel(event.renewalDate)}
          </span>
        ) : todoCount > 0 ? (
          <span className={`shrink-0 rounded-full bg-emerald-100 font-semibold text-emerald-700 ${compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            {todoCount} ✓
          </span>
        ) : undefined
      }
      trailing={
        event.cost != null ? (
          <span className={`shrink-0 font-semibold text-rose-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            −{formatAmount(event.cost)}
            {freqShort ? (
              <span className="font-normal text-slate-400">/{freqShort}</span>
            ) : null}
          </span>
        ) : undefined
      }
    >
      <EventDetailBody
        event={event}
        onEdit={onEdit}
        onArchived={onArchived}
        compact={compact}
      />
    </ExpandableCard>
  )
}

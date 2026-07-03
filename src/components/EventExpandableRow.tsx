import type { Event } from '../db'
import { ITEM_TYPE_STYLE } from '../constants/itemColors'
import { countdownLabel, countdownUrgency } from '../utils/countdown'
import { formatAmount, formatIsoDate, formatModifiedAt, sentenceCase } from '../utils/format'
import { recurrenceShort } from '../utils/recurring'
import { summarizeText } from '../utils/textSummary'
import { EventDetailBody } from './EventDetailBody'
import { ItemIconCircle } from './ItemIconCircle'
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
  /** Etichetta tipo sopra l'icona (Nota, Lista, Impegno, Spesa) */
  showTypeLabel?: boolean
}

export function EventExpandableRow({
  event,
  onEdit,
  onArchived,
  todoCount = 0,
  containerClassName = ITEM_TYPE_STYLE.event.card,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  areaName,
  compact = false,
  showTypeLabel = false,
}: EventExpandableRowProps) {
  const freqShort = recurrenceShort(event.recurrenceFrequency)
  const meta = `${freqShort ? `${freqShort} · ` : ''}${formatIsoDate(event.startDate)}${event.endDate ? ` → ${formatIsoDate(event.endDate)}` : ''}${event.labels.length > 0 ? ` · ${event.labels[0]}` : ''}${todoCount > 0 ? ` · ${todoCount} da fare` : ''}`
  const descriptionExcerpt = summarizeText(event.writtenNote)
  const titleNorm = sentenceCase(event.title.trim()).toLowerCase()
  const showDescriptionExcerpt =
    !!descriptionExcerpt &&
    descriptionExcerpt.toLowerCase() !== titleNorm &&
    !descriptionExcerpt.toLowerCase().startsWith(`${titleNorm}…`)

  const subtitleParts: string[] = []
  if (areaName) subtitleParts.push(areaName)
  subtitleParts.push(meta)
  if (showDescriptionExcerpt) subtitleParts.push(descriptionExcerpt)
  if (compact) subtitleParts.push(formatModifiedAt(event.updatedAt))
  const subtitle = subtitleParts.join(' · ')

  return (
    <ExpandableCard
      compact={compact}
      subtitleMultiline={compact}
      typeLabel={showTypeLabel ? 'Impegno' : undefined}
      containerClassName={containerClassName}
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      icon={
        <ItemIconCircle
          icon={event.icon}
          color={event.color}
          compact={compact}
        />
      }
      title={event.title}
      subtitle={subtitle}
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
        areaName={areaName}
        compact={compact}
      />
    </ExpandableCard>
  )
}

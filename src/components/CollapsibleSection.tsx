import { ChevronRight, Plus } from 'lucide-react'
import { type ReactNode } from 'react'
import { formatAmount } from '../utils/format'
import { ExpandableCard } from './ExpandableCard'

interface CollapsibleSectionProps {
  title: string
  count: number
  children: ReactNode
  alwaysShow?: boolean
  icon?: ReactNode
  subtitle?: string
  totalAmount?: number
  totalSuffix?: string
  onSeeAll?: () => void
  onAdd?: () => void
  emptyContent?: ReactNode
  containerClassName?: string
}

export function CollapsibleSection({
  title,
  count,
  children,
  alwaysShow = false,
  icon,
  subtitle,
  totalAmount,
  totalSuffix,
  onSeeAll,
  onAdd,
  emptyContent,
  containerClassName = 'border-slate-100 bg-white',
}: CollapsibleSectionProps) {
  if (!alwaysShow && count === 0) return null

  const resolvedSubtitle =
    subtitle ??
    `${count} ${count === 1 ? 'elemento' : 'elementi'}`

  const showTotal = totalAmount != null && totalAmount > 0 && count > 0

  const actions =
    onAdd || onSeeAll ? (
      <div className="flex shrink-0 items-center gap-0.5">
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-6 w-6 items-center justify-center rounded-md text-indigo-600 transition hover:bg-indigo-50"
            aria-label={`Aggiungi ${title.toLowerCase()}`}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
        {onSeeAll && count > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex h-6 w-6 items-center justify-center rounded-md text-indigo-600 transition hover:bg-indigo-50"
            aria-label={`Vedi tutti ${title.toLowerCase()}`}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ) : undefined

  return (
    <ExpandableCard
      compact
      defaultExpanded={false}
      containerClassName={containerClassName}
      icon={icon}
      title={title}
      subtitle={resolvedSubtitle}
      trailing={
        showTotal ? (
          <span className="shrink-0 text-[10px] font-bold text-rose-600">
            {formatAmount(totalAmount!)}
            {totalSuffix ? (
              <span className="font-normal text-slate-400">{totalSuffix}</span>
            ) : null}
          </span>
        ) : undefined
      }
      actions={actions}
    >
      {count > 0 ? children : emptyContent}
    </ExpandableCard>
  )
}

export function sectionIcon(
  bgClass: string,
  icon: ReactNode,
): ReactNode {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bgClass}`}
    >
      {icon}
    </div>
  )
}

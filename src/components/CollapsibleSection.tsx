import { Plus, Share2 } from 'lucide-react'
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
  onShare?: () => void
  emptyContent?: ReactNode
  containerClassName?: string
  comfortable?: boolean
  typeLabel?: string
  homeLayout?: boolean
  detailLine?: string
  extraLine?: string
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
  onShare,
  emptyContent,
  containerClassName = 'border-slate-100 bg-white',
  comfortable = false,
  typeLabel,
  homeLayout = false,
  detailLine,
  extraLine,
}: CollapsibleSectionProps) {
  if (!alwaysShow && count === 0) return null

  const resolvedSubtitle =
    subtitle ??
    `${count} ${count === 1 ? 'elemento' : 'elementi'}`

  const showTotal = totalAmount != null && totalAmount > 0 && count > 0

  const actions =
    onAdd || onSeeAll || onShare ? (
      <div className="flex shrink-0 items-center gap-0.5">
        {onShare && count > 0 && (
          <button
            type="button"
            onClick={onShare}
            className={`flex items-center justify-center rounded-md text-sky-600 transition hover:bg-sky-50 ${
              comfortable ? 'h-8 w-8' : 'h-6 w-6'
            }`}
            aria-label={`Condividi ${title.toLowerCase()}`}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        )}
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
            className={`shrink-0 rounded-md font-semibold text-indigo-600 transition hover:bg-indigo-50 ${
              comfortable ? 'px-2 py-1 text-[10px]' : 'px-1.5 py-0.5 text-[9px]'
            }`}
            aria-label={`Vedi tutti ${title.toLowerCase()}`}
          >
            Tutti
          </button>
        )}
      </div>
    ) : undefined

  return (
    <ExpandableCard
      compact={!comfortable}
      comfortable={comfortable}
      homeLayout={homeLayout}
      detailLine={detailLine}
      extraLine={extraLine}
      typeLabel={typeLabel}
      defaultExpanded={false}
      containerClassName={containerClassName}
      icon={icon}
      title={title}
      subtitle={resolvedSubtitle}
      trailing={
        homeLayout || !showTotal ? undefined : (
          <span
            className={`shrink-0 font-bold text-rose-600 ${
              comfortable ? 'text-xs' : 'text-[10px]'
            }`}
          >
            {formatAmount(totalAmount!)}
            {totalSuffix ? (
              <span className="font-normal text-slate-400">{totalSuffix}</span>
            ) : null}
          </span>
        )
      }
      actions={homeLayout ? undefined : actions}
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

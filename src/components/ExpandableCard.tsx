import { ChevronDown, ChevronRight } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { sentenceCase } from '../utils/format'

interface ExpandableCardProps {
  icon: ReactNode
  title: string
  subtitle?: string
  titleClassName?: string
  badge?: ReactNode
  trailing?: ReactNode
  actions?: ReactNode
  containerClassName?: string
  bodyClassName?: string
  children?: ReactNode
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  compact?: boolean
}

/** Riga compatta stile evento — tap per espandere il contenuto */
export function ExpandableCard({
  icon,
  title,
  subtitle,
  titleClassName = 'text-slate-800',
  badge,
  trailing,
  actions,
  containerClassName = 'border-slate-100 bg-white',
  bodyClassName,
  children,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  compact = false,
}: ExpandableCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const expanded = controlledExpanded ?? internalExpanded
  const hasBody = children != null

  const resolvedBodyClassName =
    bodyClassName ??
    (compact ? 'px-2 py-1.5 space-y-1.5' : 'px-3 py-3 space-y-3')

  function toggleExpanded() {
    if (!hasBody) return
    const next = !expanded
    if (controlledExpanded === undefined) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  return (
    <div
      className={`overflow-hidden border ${compact ? 'rounded-lg shadow-none' : 'rounded-xl shadow-sm'} ${containerClassName}`}
    >
      <div
        className={`flex items-center ${compact ? 'gap-1 px-2 py-1.5' : 'gap-2 px-3 py-2.5'}`}
      >
        <button
          type="button"
          onClick={toggleExpanded}
          className={`flex min-w-0 flex-1 items-center text-left ${compact ? 'gap-2' : 'gap-3'}`}
          aria-expanded={hasBody ? expanded : undefined}
          disabled={!hasBody}
        >
          {icon}
          <div className="min-w-0 flex-1">
            <p
              className={`truncate font-medium ${compact ? 'text-xs' : 'text-sm'} ${titleClassName}`}
            >
              {sentenceCase(title)}
            </p>
            {subtitle && (
              <p
                className={`truncate text-slate-400 ${compact ? 'text-[10px] leading-tight' : 'text-xs'}`}
              >
                {subtitle}
              </p>
            )}
          </div>
          {badge}
          {trailing}
          {hasBody &&
            (expanded ? (
              <ChevronDown
                className={`shrink-0 text-slate-400 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`}
              />
            ) : (
              <ChevronRight
                className={`shrink-0 text-slate-300 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`}
              />
            ))}
        </button>
        {actions}
      </div>

      {expanded && hasBody && (
        <div className={`border-t border-slate-100/80 ${resolvedBodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  )
}

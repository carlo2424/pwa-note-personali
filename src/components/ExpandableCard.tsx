import { ChevronDown, ChevronRight } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { sentenceCase } from '../utils/format'
import type { HomeDeadlineLine } from '../utils/homeSpotlight'
import { HomeDeadlineLines } from './HomeDeadlineLines'

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
  comfortable?: boolean
  /** Sottotitolo su due righe (utile in Home con riassunto) */
  subtitleMultiline?: boolean
  /** Layout Home chiuso: titolo + sottotitolo + terza riga */
  homeLayout?: boolean
  /** Terza riga (es. scadenza e riassunto) — con homeLayout */
  detailLine?: string
  /** Quarta riga opzionale — con homeLayout */
  extraLine?: string
  /** Righe scadenza settimana (home) */
  deadlineLines?: HomeDeadlineLine[]
  deadlineOverflowLabel?: (hidden: number) => string
  /** Righe riepilogo voci (es. titolo + ultima modifica) */
  summaryLines?: HomeDeadlineLine[]
  summaryOverflowLabel?: (hidden: number) => string
  /** Es. Nota, Lista, Impegno, Spesa — mostrato sopra l'icona */
  typeLabel?: string
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
  comfortable = false,
  subtitleMultiline = false,
  homeLayout = false,
  detailLine,
  extraLine,
  deadlineLines,
  deadlineOverflowLabel,
  summaryLines,
  summaryOverflowLabel,
  typeLabel,
}: ExpandableCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const expanded = controlledExpanded ?? internalExpanded
  const hasBody = children != null
  const dense = compact && !comfortable

  const resolvedBodyClassName =
    bodyClassName ??
    (dense
      ? 'px-2 py-1.5 space-y-1.5'
      : comfortable
        ? 'px-3 py-2.5 space-y-2'
        : 'px-3 py-3 space-y-3')

  function toggleExpanded() {
    if (!hasBody) return
    const next = !expanded
    if (controlledExpanded === undefined) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  function renderIcon() {
    if (!typeLabel) return icon
    return (
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <span
          className={`font-semibold uppercase tracking-wide text-slate-500 ${
            dense ? 'text-[7px] leading-none' : 'text-[8px] leading-none'
          }`}
        >
          {typeLabel}
        </span>
        {icon}
      </div>
    )
  }

  return (
    <div
      className={`overflow-hidden border ${dense ? 'rounded-lg shadow-none' : comfortable ? 'rounded-xl shadow-sm' : compact ? 'rounded-lg shadow-none' : 'rounded-xl shadow-sm'} ${containerClassName}`}
    >
      <div
        className={`flex min-w-0 ${
          homeLayout ? 'items-start' : 'items-center'
        } ${
          dense
            ? 'gap-1 px-2 py-1.5'
            : comfortable
              ? 'gap-2.5 px-3 py-2.5'
              : compact
                ? 'gap-1 px-2 py-1.5'
                : 'gap-2 px-3 py-2.5'
        }`}
      >
        <button
          type="button"
          onClick={toggleExpanded}
          className={`flex min-w-0 flex-1 text-left ${
            homeLayout ? 'items-start' : 'items-center'
          } ${dense ? 'gap-2' : comfortable ? 'gap-3' : compact ? 'gap-2' : 'gap-3'}`}
          aria-expanded={hasBody ? expanded : undefined}
          disabled={!hasBody}
        >
          {renderIcon()}
          <div className="min-w-0 flex-1">
            {homeLayout ? (
              <div className="space-y-0.5">
                <p
                  className={`line-clamp-1 font-semibold leading-tight text-slate-900 ${
                    dense ? 'text-xs' : 'text-sm'
                  } ${titleClassName}`}
                >
                  {sentenceCase(title)}
                </p>
                {subtitle ? (
                  <p
                    className={`line-clamp-2 whitespace-normal leading-snug text-slate-600 ${
                      dense ? 'text-[10px]' : 'text-xs'
                    }`}
                  >
                    {subtitle}
                  </p>
                ) : null}
                {detailLine ? (
                  <p
                    className={`line-clamp-2 whitespace-normal leading-snug text-slate-500 ${
                      dense ? 'text-[10px]' : 'text-xs'
                    }`}
                  >
                    {detailLine}
                  </p>
                ) : null}
                {extraLine ? (
                  <p
                    className={`line-clamp-2 whitespace-normal leading-snug text-slate-500 ${
                      dense ? 'text-[10px]' : 'text-xs'
                    }`}
                  >
                    {extraLine}
                  </p>
                ) : null}
                {summaryLines && summaryLines.length > 0 ? (
                  <HomeDeadlineLines
                    lines={summaryLines}
                    compact={dense}
                    overflowLabel={summaryOverflowLabel}
                  />
                ) : null}
                {deadlineLines && deadlineLines.length > 0 ? (
                  <HomeDeadlineLines
                    lines={deadlineLines}
                    compact={dense}
                    maxLines={5}
                    overflowLabel={deadlineOverflowLabel}
                  />
                ) : null}
              </div>
            ) : (
              <>
                <p
                  className={`font-medium ${
                    subtitleMultiline ? 'line-clamp-2 whitespace-normal' : 'truncate'
                  } ${
                    dense
                      ? 'text-xs'
                      : comfortable
                        ? 'text-sm'
                        : compact
                          ? 'text-xs'
                          : 'text-sm'
                  } ${titleClassName}`}
                >
                  {sentenceCase(title)}
                </p>
                {subtitle && (
                  <p
                    className={`text-slate-500 truncate ${
                      dense
                        ? 'text-[10px] leading-tight'
                        : comfortable
                          ? 'text-xs leading-snug'
                          : compact
                            ? 'text-[10px] leading-snug'
                            : 'text-xs'
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
          {!homeLayout ? badge : null}
          {hasBody &&
            (expanded ? (
              <ChevronDown
                className={`shrink-0 text-slate-400 ${
                  dense || (compact && !comfortable) ? 'h-3 w-3' : 'h-4 w-4'
                }`}
              />
            ) : (
              <ChevronRight
                className={`shrink-0 text-slate-300 ${
                  dense || (compact && !comfortable) ? 'h-3 w-3' : 'h-4 w-4'
                }`}
              />
            ))}
        </button>
        {!homeLayout && trailing ? <div className="shrink-0">{trailing}</div> : null}
        {actions ? <div className="flex shrink-0 items-center">{actions}</div> : null}
      </div>

      {expanded && hasBody && (
        <div className={`border-t border-slate-100/80 ${resolvedBodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  )
}

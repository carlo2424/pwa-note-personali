import {
  deadlineToneClassName,
  type HomeDeadlineLine,
} from '../utils/homeSpotlight'

interface HomeDeadlineLinesProps {
  lines: HomeDeadlineLine[]
  compact?: boolean
  /** Se omesso, mostra tutte le righe */
  maxLines?: number
  /** Scadenze non mostrate (es. date successive alla prossima) */
  overflowCount?: number
  overflowLabel?: (hidden: number) => string
}

export function HomeDeadlineLines({
  lines,
  compact = false,
  maxLines,
  overflowCount,
  overflowLabel,
}: HomeDeadlineLinesProps) {
  if (lines.length === 0) return null

  const visible = maxLines == null ? lines : lines.slice(0, maxLines)
  const hidden =
    overflowCount ?? Math.max(0, lines.length - visible.length)

  return (
    <div className="space-y-0.5">
      {visible.map((line, index) => (
        <p
          key={`${line.label}-${index}`}
          className={`whitespace-normal leading-snug ${deadlineToneClassName(line.tone)} ${
            compact ? 'text-[10px]' : 'text-xs'
          }`}
        >
          {line.label}
        </p>
      ))}
      {hidden > 0 && (
        <p className={`text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {overflowLabel
            ? overflowLabel(hidden)
            : `+${hidden} ${hidden === 1 ? 'altra scadenza' : 'altre scadenze'}`}
        </p>
      )}
    </div>
  )
}

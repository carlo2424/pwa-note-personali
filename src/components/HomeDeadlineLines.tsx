import {
  deadlineToneClassName,
  type HomeDeadlineLine,
} from '../utils/homeSpotlight'

interface HomeDeadlineLinesProps {
  lines: HomeDeadlineLine[]
  compact?: boolean
  maxLines?: number
}

export function HomeDeadlineLines({
  lines,
  compact = false,
  maxLines = 5,
}: HomeDeadlineLinesProps) {
  if (lines.length === 0) return null

  const visible = lines.slice(0, maxLines)
  const hidden = lines.length - visible.length

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
          +{hidden} {hidden === 1 ? 'altra scadenza' : 'altre scadenze'}
        </p>
      )}
    </div>
  )
}

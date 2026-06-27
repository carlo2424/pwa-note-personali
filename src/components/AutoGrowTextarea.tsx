import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

interface AutoGrowTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  maxRows?: number
}

/** Textarea che parte da una riga e cresce con il testo */
export function AutoGrowTextarea({
  value,
  onChange,
  maxRows = 6,
  className = '',
  ...props
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    const style = getComputedStyle(el)
    const lineHeight = Number.parseFloat(style.lineHeight) || 20
    const padding =
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom)
    const maxHeight = lineHeight * maxRows + padding
    const next = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [value, maxRows])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      className={`resize-none ${className}`}
      {...props}
    />
  )
}

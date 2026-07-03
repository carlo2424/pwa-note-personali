export function NavBadge({
  count,
  urgent = false,
}: {
  count: number
  urgent?: boolean
}) {
  if (count <= 0) return null
  return (
    <span
      className={`absolute -right-1 -top-0.5 text-[9px] font-bold leading-none ${
        urgent ? 'text-rose-600' : 'text-slate-600'
      }`}
      aria-label={`${count} elementi${urgent ? ', alcuni in ritardo' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

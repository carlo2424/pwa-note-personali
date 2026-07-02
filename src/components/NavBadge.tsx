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
      className={`absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white ${
        urgent ? 'bg-rose-600' : 'bg-indigo-600'
      }`}
      aria-label={`${count} elementi${urgent ? ', alcuni in ritardo' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

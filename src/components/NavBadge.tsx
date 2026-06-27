export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white"
      aria-label={`${count} in ritardo`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

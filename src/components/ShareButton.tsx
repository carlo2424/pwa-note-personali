import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  onClick: () => void
  compact?: boolean
  className?: string
}

export function ShareButton({
  onClick,
  compact = false,
  className = '',
}: ShareButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={`flex w-full items-center justify-center border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 ${
        compact
          ? 'gap-1 rounded-lg py-1.5 text-[10px]'
          : 'gap-1.5 rounded-xl py-2 text-xs'
      } ${className}`}
    >
      <Share2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      Condividi
    </button>
  )
}

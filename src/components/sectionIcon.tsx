import { type ReactNode } from 'react'

export function sectionIcon(bgClass: string, icon: ReactNode): ReactNode {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bgClass}`}
    >
      {icon}
    </div>
  )
}

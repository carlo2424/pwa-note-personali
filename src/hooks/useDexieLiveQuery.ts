import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

export function useDexieLiveQuery<T>(
  queryFn: () => T | Promise<T>,
  deps: unknown[] = [],
): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined)

  useEffect(() => {
    let active = true

    const subscription = liveQuery(queryFn).subscribe({
      next: (value) => {
        if (active) setResult(value)
      },
      error: (err) => {
        console.error('[useDexieLiveQuery] Errore query:', err)
      },
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return result
}

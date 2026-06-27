import { useDexieLiveQuery } from '../hooks/useDexieLiveQuery'
import { computeOverdueCounts, type OverdueCounts } from '../utils/overdue'

const EMPTY: OverdueCounts = { impegni: 0 }

export function useOverdueCounts(): OverdueCounts {
  const counts = useDexieLiveQuery(() => computeOverdueCounts())
  return counts ?? EMPTY
}

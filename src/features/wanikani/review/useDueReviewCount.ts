import { useDebouncedQuery } from '../../../lib/useDebouncedQuery'
import { useMinuteClock } from '../../../lib/useMinuteClock'
import { countDueReviews } from './loadReviewData'

export function useDueReviewCount() {
  const now = useMinuteClock()
  return useDebouncedQuery(() => countDueReviews(), [now]) ?? 0
}

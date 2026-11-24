import { useDebouncedQuery } from '../../../lib/useDebouncedQuery'
import { db } from '../data/db'
import { useMinuteClock } from '../../../lib/useMinuteClock'
import { countDueReviews } from './loadReviewData'

export function useDueReviewCount() {
  const now = useMinuteClock()
  return useDebouncedQuery(() => countDueReviews(), [now], [
    db.user,
    db.assignments,
    db.subjects,
  ]) ?? 0
}

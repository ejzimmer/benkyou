import { useLiveQuery } from 'dexie-react-hooks'
import { useMinuteClock } from '../../../lib/useMinuteClock'
import { countDueReviews } from './loadReviewData'

export function useDueReviewCount() {
  const now = useMinuteClock()
  return useLiveQuery(countDueReviews, [now]) ?? 0
}

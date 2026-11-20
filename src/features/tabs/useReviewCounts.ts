import { useDueCardCount } from "../collection/useDueCardCount"
import { useDueReviewCount } from "../wanikani/review/useDueReviewCount"
import type { TabId } from "./tabs"

export function useReviewCounts(): Partial<Record<TabId, number>> {
  return {
    wanikani: useDueReviewCount(),
    cards: useDueCardCount(),
  }
}

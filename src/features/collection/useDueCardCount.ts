import { db } from "../../lib/db/schema"
import { useDebouncedQuery } from "../../lib/useDebouncedQuery"
import { useMinuteClock } from "../../lib/useMinuteClock"
import { countDueCards } from "./countDueCards"

export function useDueCardCount() {
  const now = useMinuteClock()
  return useDebouncedQuery(() => countDueCards(now), [now], [
    db.scheduling,
    db.cards,
  ]) ?? 0
}

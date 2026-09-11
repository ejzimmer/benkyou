import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import type { Card } from "../../domain/types"
import {
  findDismissedDuplicateCards,
  findDuplicateCards,
} from "../../domain/duplicates"
import { db } from "../../lib/db/schema"

export type DuplicateCards = {
  /** Candidates still reported as possible duplicates. */
  matches: Card[]
  /** Candidates the user has confirmed aren't duplicates. */
  dismissed: Card[]
  /** True until the cards table has been read at least once. */
  loading: boolean
}

/**
 * Live duplicate candidates for `card`, split into the ones still worth
 * reporting and the ones already dismissed.
 *
 * The Dexie query deliberately doesn't depend on `card`, so stepping through
 * a review session re-filters the list already in memory instead of
 * re-reading the whole cards table for every card. It's still a live query,
 * so it refreshes on its own after a merge, a dismissal, or a sync.
 */
export function useDuplicateCards(card: Card | null | undefined): DuplicateCards {
  // Nothing to compare against on the new-card form, so don't read the whole
  // cards table there — the query still has to be declared unconditionally.
  const enabled = Boolean(card)
  const allCards = useLiveQuery(
    async () => (enabled ? await db.cards.toArray() : null),
    [enabled],
  )
  return useMemo(() => {
    if (!card || !allCards) {
      return { matches: [], dismissed: [], loading: Boolean(card) && !allCards }
    }
    // Prefer the freshly-read row over the caller's copy: the review queue
    // snapshots its cards when the session starts, so `card` can predate a
    // dismissal written moments ago.
    const fresh = allCards.find((other) => other.id === card.id) ?? card
    return {
      matches: findDuplicateCards(fresh, allCards),
      dismissed: findDismissedDuplicateCards(fresh, allCards),
      loading: false,
    }
  }, [card, allCards])
}

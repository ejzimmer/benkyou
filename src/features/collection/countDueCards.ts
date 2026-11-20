import { reviewModesForCard } from "../../domain/types"
import { db } from "../../lib/db/schema"
import { endOfLocalDay } from "../../services/review"

/** Counts due review items the same way as the review queue: only modes
 *  still valid for their card. */
export async function countDueCards(now: number) {
  const dueRows = await db.scheduling
    .where("due")
    .belowOrEqual(endOfLocalDay(now))
    .toArray()
  const cardIds = [...new Set(dueRows.map((row) => row.cardId))]
  const cards = await db.cards.bulkGet(cardIds)
  const cardsById = new Map(
    cards.flatMap((card) => (card ? [[card.id, card] as const] : [])),
  )
  return dueRows.filter((row) => {
    const card = cardsById.get(row.cardId)
    return card !== undefined && reviewModesForCard(card).includes(row.modeId)
  }).length
}

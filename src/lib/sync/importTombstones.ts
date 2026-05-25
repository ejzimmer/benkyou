import type { BulkImportPayload } from "../import/types"
import { clearTombstone } from "./tombstones"
import { tombstoneId } from "./syncCompare"

/** After re-import, drop stale delete markers so sync and review see the deck again. */
export async function clearTombstonesForBulkImport(
  payload: BulkImportPayload,
): Promise<void> {
  await clearTombstone("deck", payload.deck.id)
  for (const card of payload.cards) {
    await clearTombstone("card", card.id)
    for (const id of card.content.images) {
      await clearTombstone("media", id)
    }
  }
  for (const row of payload.scheduling) {
    await clearTombstone("scheduling", row.id)
  }
  for (const item of payload.media) {
    await clearTombstone("media", item.id)
  }
}

export function remoteTombstoneIdsForBulkImport(
  payload: BulkImportPayload,
): string[] {
  const ids = [tombstoneId("deck", payload.deck.id)]
  for (const card of payload.cards) {
    ids.push(tombstoneId("card", card.id))
    for (const imageId of card.content.images) {
      ids.push(tombstoneId("media", imageId))
    }
  }
  for (const row of payload.scheduling) {
    ids.push(tombstoneId("scheduling", row.id))
  }
  for (const item of payload.media) {
    ids.push(tombstoneId("media", item.id))
  }
  return [...new Set(ids)]
}

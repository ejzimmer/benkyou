import type { User } from "firebase/auth"
import { db } from "../lib/db/schema"
import type { BulkImportPayload } from "../lib/import/types"
import { pushLocalMediaToRemote } from "../lib/sync/mediaSync"
import { pushCardRemote, pushSchedulingRemote } from "./decks"
import { getFirestoreDb } from "../lib/firebase"
import {
  deleteTombstoneRemote,
  upsertDeckRemote,
} from "../lib/sync/firestoreSync"
import { tombstoneId } from "../lib/sync/syncCompare"

function mediaItemBytes(item: BulkImportPayload["media"][number]): Uint8Array {
  if (item.bytes) return item.bytes
  if (item.base64) {
    const binary = atob(item.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  throw new Error(`Media ${item.id} has no bytes or base64`)
}

/**
 * Tombstones that belong to the entities we're about to (re-)import. Card
 * and deck ids are deterministic in `convert.ts`, so re-importing the same
 * .apkg after a delete reuses the same ids. Leaving the prior tombstones in
 * place would let `runSync.collectEntityConflicts` skip these entities on
 * any other device the next time it pulls.
 */
function tombstoneIdsToClear(payload: BulkImportPayload): string[] {
  const ids = new Set<string>()
  ids.add(tombstoneId("deck", payload.deck.id))
  for (const card of payload.cards) {
    ids.add(tombstoneId("card", card.id))
    for (const imgId of card.content.images) {
      ids.add(tombstoneId("media", imgId))
    }
  }
  for (const row of payload.scheduling) {
    ids.add(tombstoneId("scheduling", row.id))
  }
  for (const item of payload.media) {
    ids.add(tombstoneId("media", item.id))
  }
  return [...ids]
}

export async function applyBulkImport(
  payload: BulkImportPayload,
  user: User | null,
): Promise<void> {
  const tombstonesToClear = tombstoneIdsToClear(payload)

  await db.transaction(
    "rw",
    [db.decks, db.cards, db.scheduling, db.media, db.tombstones],
    async () => {
      for (const id of tombstonesToClear) {
        await db.tombstones.delete(id)
      }
      await db.decks.put(payload.deck)
      for (const item of payload.media) {
        const bytes = mediaItemBytes(item)
        await db.media.put({
          id: item.id,
          blob: new Blob([bytes], { type: item.mimeType }),
          mimeType: item.mimeType,
          updatedAt: Date.now(),
        })
      }
      for (const card of payload.cards) {
        await db.cards.put(card)
      }
      for (const row of payload.scheduling) {
        await db.scheduling.put(row)
      }
    },
  )

  if (!user) return

  const fs = getFirestoreDb()
  if (fs) {
    await upsertDeckRemote(fs, user.uid, payload.deck)
    // Eagerly remove any stale tombstones from Firestore as well so other
    // devices won't shadow the re-imported entities on their next pull.
    for (const id of tombstonesToClear) {
      await deleteTombstoneRemote(fs, user.uid, id)
    }
  }

  for (const card of payload.cards) {
    await pushCardRemote(user, card.id)
  }
  for (const row of payload.scheduling) {
    await pushSchedulingRemote(user, row.id)
  }
  await pushLocalMediaToRemote(user.uid, payload.cards)
}

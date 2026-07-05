import type { User } from "firebase/auth"
import { db } from "../lib/db/schema"
import type { BulkImportPayload } from "../lib/import/types"
import { pushLocalMediaToRemote } from "../lib/sync/mediaSync"
import { getFirestoreDb } from "../lib/firebase"
import { pushImportedDeckBatched } from "../lib/sync/firestoreSync"
import { tombstoneId } from "../lib/sync/syncCompare"

/** Coarse import progress for the UI. "reading" is emitted by the caller. */
export type ImportProgress =
  | { phase: "reading"; current: number; total: number }
  | { phase: "saving"; current: number; total: number }
  | { phase: "syncing"; current: number; total: number }
  | { phase: "uploading-media"; current: number; total: number }

export type ImportProgressFn = (progress: ImportProgress) => void

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
  onProgress?: ImportProgressFn,
): Promise<void> {
  const report = onProgress ?? (() => {})
  const tombstonesToClear = tombstoneIdsToClear(payload)

  const savingTotal = payload.cards.length
  report({ phase: "saving", current: 0, total: savingTotal })
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
      let savedCards = 0
      for (const card of payload.cards) {
        await db.cards.put(card)
        savedCards += 1
        // Report every few cards so the bar visibly advances without
        // flooding React with a re-render per card.
        if (savedCards % 5 === 0 || savedCards === savingTotal) {
          report({ phase: "saving", current: savedCards, total: savingTotal })
        }
      }
      for (const row of payload.scheduling) {
        await db.scheduling.put(row)
      }
    },
  )

  if (!user) return

  const fs = getFirestoreDb()
  if (fs) {
    // Deck, cards, scheduling rows, and stale-tombstone deletes go up in a
    // handful of batched commits (up to 400 writes each) rather than one
    // round trip per card/row — the latter can take many minutes on a slow
    // connection with long gaps between progress updates.
    const total =
      1 + payload.cards.length + payload.scheduling.length + tombstonesToClear.length
    report({ phase: "syncing", current: 0, total })
    await pushImportedDeckBatched(
      fs,
      user.uid,
      payload.deck,
      payload.cards,
      payload.scheduling,
      tombstonesToClear,
      (current) => report({ phase: "syncing", current, total }),
    )
  }

  // pushLocalMediaToRemote reports its own initial (0, total) once it knows
  // the real media count, so no placeholder report is needed here.
  await pushLocalMediaToRemote(user.uid, payload.cards, (current, total) =>
    report({ phase: "uploading-media", current, total }),
  )
}

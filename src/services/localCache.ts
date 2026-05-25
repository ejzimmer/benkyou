import { db } from "../lib/db/schema"
import { clearSyncLog } from "../lib/sync/syncLog"
import {
  clearPullOnlySyncPending,
  LAST_SYNCED_AT_KEY,
  markPullOnlySyncPending,
} from "../lib/sync/syncTypes"

/** Wipe on-device study data. Does not write tombstones or touch Firebase. */
export async function clearLocalCacheOnly(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.decks,
      db.cards,
      db.scheduling,
      db.media,
      db.tombstones,
      db.syncOutbox,
      db.reviewEvents,
      db.reviewUndo,
    ],
    async () => {
      await db.decks.clear()
      await db.cards.clear()
      await db.scheduling.clear()
      await db.media.clear()
      await db.tombstones.clear()
      await db.syncOutbox.clear()
      await db.reviewEvents.clear()
      await db.reviewUndo.clear()
    },
  )
  localStorage.removeItem(LAST_SYNCED_AT_KEY)
  clearPullOnlySyncPending()
  markPullOnlySyncPending()
  clearSyncLog()
}

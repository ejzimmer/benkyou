import type { FirebaseStorage } from "firebase/storage"
import { db } from "../db/schema"
import { deleteMediaBlob } from "./mediaSync"
import { syncLog } from "./syncLog"

/** Delete Storage blobs for tombstoned media once (skip repeat 404s on later syncs). */
export async function purgeTombstonedMediaStorage(
  storage: FirebaseStorage,
  uid: string,
): Promise<void> {
  const tombs = await db.tombstones
    .where("entityType")
    .equals("media")
    .toArray()
  let purged = 0
  let skipped = 0
  for (const t of tombs) {
    if (t.storagePurgedAt != null) {
      skipped++
      continue
    }
    try {
      await deleteMediaBlob(storage, uid, t.entityId)
      await db.tombstones.update(t.id, {
        ...t,
        storagePurgedAt: Date.now(),
      })
      purged++
    } catch (e) {
      syncLog("purge tombstoned media failed", {
        mediaId: t.entityId,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }
  if (purged > 0 || skipped > 0) {
    syncLog("purge tombstoned media complete", { purged, skipped })
  }
}

import type { FirebaseStorage } from "firebase/storage"
import { db } from "../db/schema"
import {
  isMediaStoragePurged,
  markMediaStoragePurged,
} from "./mediaStoragePurged"
import { deleteMediaBlob } from "./mediaSync"
import { syncLog } from "./syncLog"
import type { Tombstone } from "./syncTypes"

export type PurgeMediaOptions = {
  /** Media IDs that exist in Firestore metadata (had been uploaded). */
  remoteMediaIds?: Set<string>
}

async function markMediaTombstonePurged(
  uid: string,
  tomb: Tombstone,
): Promise<void> {
  markMediaStoragePurged(uid, tomb.entityId)
  if (tomb.storagePurgedAt == null) {
    await db.tombstones.update(tomb.id, {
      ...tomb,
      storagePurgedAt: Date.now(),
    })
  }
}

/** Delete Storage blobs for tombstoned media once (skip repeat 404s on later syncs). */
export async function purgeTombstonedMediaStorage(
  storage: FirebaseStorage,
  uid: string,
  options: PurgeMediaOptions = {},
): Promise<void> {
  const { remoteMediaIds } = options
  const tombs = await db.tombstones
    .where("entityType")
    .equals("media")
    .toArray()

  if (tombs.length === 0) return

  let purged = 0
  let skipped = 0
  let skippedNeverUploaded = 0

  for (const t of tombs) {
    if (
      t.storagePurgedAt != null ||
      isMediaStoragePurged(uid, t.entityId)
    ) {
      skipped++
      continue
    }

    const hasLocalBlob = Boolean(await db.media.get(t.entityId))
    if (remoteMediaIds != null) {
      const onRemote = remoteMediaIds.has(t.entityId)
      if (!onRemote && !hasLocalBlob) {
        await markMediaTombstonePurged(uid, t)
        skippedNeverUploaded++
        continue
      }
    }

    try {
      await deleteMediaBlob(storage, uid, t.entityId)
      await markMediaTombstonePurged(uid, t)
      purged++
    } catch (e) {
      syncLog("purge tombstoned media failed", {
        mediaId: t.entityId,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  if (purged > 0 || skipped > 0 || skippedNeverUploaded > 0) {
    syncLog("purge tombstoned media complete", {
      purged,
      skipped,
      skippedNeverUploaded,
      total: tombs.length,
    })
  }
}

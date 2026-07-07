import { db, type MediaRow } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import { getFirestoreDb, getFirebaseStorage } from "../lib/firebase"
import { upsertMediaMetaRemote } from "../lib/sync/firestoreSync"
import {
  downloadMediaFromRemote,
  uploadMediaBlob,
} from "../lib/sync/mediaSync"
import { mediaBlobDigest } from "../lib/sync/syncCompare"
import { schedulePushAfterMutation } from "../lib/sync/schedulePush"
import { recordTombstone } from "../lib/sync/tombstones"
import type { User } from "firebase/auth"

export async function saveImageBlob(
  blob: Blob,
  user: User | null = null,
): Promise<string> {
  const id = newId()
  const now = Date.now()
  const digest = await mediaBlobDigest(blob)
  const row = {
    id,
    blob,
    mimeType: blob.type || "image/png",
    updatedAt: now,
    digest,
  }
  await db.media.put(row)

  const fs = getFirestoreDb()
  const storage = getFirebaseStorage()
  if (fs && storage && user) {
    await upsertMediaMetaRemote(fs, user.uid, row)
    try {
      await uploadMediaBlob(storage, user.uid, row)
    } catch {
      schedulePushAfterMutation(user)
    }
  } else {
    schedulePushAfterMutation(user)
  }

  return id
}

/** Remove an image's blob locally and mark it for removal on the next sync. */
export async function deleteImageBlob(
  mediaId: string,
  user: User | null = null,
): Promise<void> {
  await recordTombstone("media", mediaId)
  await db.media.delete(mediaId)
  schedulePushAfterMutation(user)
}

/** Ensure image bytes exist in IndexedDB; download from Storage when missing. */
export async function ensureMediaCached(
  mediaId: string,
  user: User | null,
): Promise<MediaRow | null> {
  const existing = await db.media.get(mediaId)
  if (existing?.blob && existing.blob.size > 0) return existing

  if (!user) return existing ?? null

  const blob = await downloadMediaFromRemote(user.uid, mediaId)
  if (!blob || blob.size === 0) return null

  const row: MediaRow = {
    id: mediaId,
    blob,
    mimeType: existing?.mimeType ?? blob.type ?? "image/jpeg",
    updatedAt: Date.now(),
  }
  await db.media.put(row)
  return row
}

export async function getImageUrl(
  mediaId: string,
  user: User | null = null,
): Promise<string | null> {
  const row = await ensureMediaCached(mediaId, user)
  if (!row) return null
  return URL.createObjectURL(row.blob)
}

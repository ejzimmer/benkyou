import { db } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import { getFirestoreDb, getFirebaseStorage } from "../lib/firebase"
import { upsertMediaMetaRemote } from "../lib/sync/firestoreSync"
import { uploadMediaBlob } from "../lib/sync/mediaSync"
import { schedulePushAfterMutation } from "../lib/sync/schedulePush"
import type { User } from "firebase/auth"

export async function saveImageBlob(
  blob: Blob,
  user: User | null = null,
): Promise<string> {
  const id = newId()
  const now = Date.now()
  const row = {
    id,
    blob,
    mimeType: blob.type || "image/png",
    updatedAt: now,
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

export async function getImageUrl(mediaId: string): Promise<string | null> {
  const row = await db.media.get(mediaId)
  if (!row) return null
  return URL.createObjectURL(row.blob)
}

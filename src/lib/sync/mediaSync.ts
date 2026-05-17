import { getBytes, ref, uploadBytes } from "firebase/storage"
import type { Card } from "../../domain/types"
import { db } from "../db/schema"
import { getFirebaseStorage } from "../firebase"

function mediaStoragePath(uid: string, mediaId: string): string {
  return `users/${uid}/media/${mediaId}`
}

export function collectMediaIdsFromCards(cards: Card[]): string[] {
  const ids = new Set<string>()
  for (const card of cards) {
    const list =
      card.kind === "vocabulary" ? card.content.images : card.content.images
    for (const id of list) ids.add(id)
  }
  return [...ids]
}

export async function uploadMediaToRemote(
  uid: string,
  mediaId: string,
  blob: Blob,
): Promise<void> {
  const storage = getFirebaseStorage()
  if (!storage) return
  await uploadBytes(ref(storage, mediaStoragePath(uid, mediaId)), blob, {
    contentType: blob.type || "application/octet-stream",
  })
}

export async function downloadMediaFromRemote(
  uid: string,
  mediaId: string,
): Promise<Blob | null> {
  const storage = getFirebaseStorage()
  if (!storage) return null
  try {
    const bytes = await getBytes(ref(storage, mediaStoragePath(uid, mediaId)))
    const row = await db.media.get(mediaId)
    const mimeType = row?.mimeType ?? "application/octet-stream"
    return new Blob([bytes], { type: mimeType })
  } catch {
    return null
  }
}

/** Push local media blobs referenced by cards (skips already uploaded when present locally). */
export async function pushLocalMediaToRemote(
  uid: string,
  cards: Card[],
): Promise<void> {
  const storage = getFirebaseStorage()
  if (!storage) return
  const ids = collectMediaIdsFromCards(cards)
  for (const mediaId of ids) {
    const row = await db.media.get(mediaId)
    if (!row) continue
    await uploadMediaToRemote(uid, mediaId, row.blob)
  }
}

/** Pull remote blobs for media ids used on cards but missing locally. */
export async function pullRemoteMediaToLocal(
  uid: string,
  cards: Card[],
): Promise<void> {
  const storage = getFirebaseStorage()
  if (!storage) return
  const ids = collectMediaIdsFromCards(cards)
  for (const mediaId of ids) {
    const local = await db.media.get(mediaId)
    if (local) continue
    const blob = await downloadMediaFromRemote(uid, mediaId)
    if (!blob) continue
    await db.media.put({
      id: mediaId,
      blob,
      mimeType: blob.type || "application/octet-stream",
    })
  }
}

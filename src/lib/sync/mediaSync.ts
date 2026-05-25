import {
  deleteObject,
  getBlob,
  getBytes,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage"
import type { Card } from "../../domain/types"
import type { MediaRow } from "../db/schema"
import { db } from "../db/schema"
import { getFirebaseStorage } from "../firebase"
import { syncLog } from "./syncLog"
import { withStorageTimeout } from "./storageTimeout"
import type { RemoteMediaMeta } from "./syncTypes"

function isLikelyStorageCorsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes("cors") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror")
  )
}

export function mediaStoragePath(uid: string, mediaId: string): string {
  return `users/${uid}/media/${mediaId}`
}

export async function uploadMediaBlob(
  storage: FirebaseStorage,
  uid: string,
  row: MediaRow,
): Promise<void> {
  const path = mediaStoragePath(uid, row.id)
  await withStorageTimeout(`upload ${row.id}`, () =>
    uploadBytes(ref(storage, path), row.blob, {
      contentType: row.mimeType,
    }),
  )
}

export async function downloadMediaBlob(
  storage: FirebaseStorage,
  uid: string,
  meta: RemoteMediaMeta,
): Promise<MediaRow> {
  const path = mediaStoragePath(uid, meta.id)
  const blob = await withStorageTimeout(`download ${meta.id}`, () =>
    getBlob(ref(storage, path)),
  )
  return {
    id: meta.id,
    blob,
    mimeType: meta.mimeType,
    updatedAt: meta.updatedAt,
  }
}

export function isStorageObjectNotFound(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const code =
      "code" in error ? String((error as { code: string }).code) : ""
    if (
      code === "storage/object-not-found" ||
      code === "storage/not-found"
    ) {
      return true
    }
    if ("status_" in error && (error as { status_: number }).status_ === 404) {
      return true
    }
    if (
      "serverResponse" in error &&
      typeof (error as { serverResponse: unknown }).serverResponse ===
        "object" &&
      (error as { serverResponse: { status?: number } }).serverResponse
        ?.status === 404
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    return /object-not-found|not-found|404/i.test(error.message)
  }
  return false
}

/** Deletes the Storage blob; missing objects are treated as success. */
export async function deleteMediaBlob(
  storage: FirebaseStorage,
  uid: string,
  mediaId: string,
): Promise<void> {
  try {
    await deleteObject(ref(storage, mediaStoragePath(uid, mediaId)))
  } catch (e) {
    if (isStorageObjectNotFound(e)) return
    throw e
  }
}

export function mediaPreviewUrl(row: MediaRow): string {
  return URL.createObjectURL(row.blob)
}

/** Used by Anki / bulk import after local save */
export function collectMediaIdsFromCards(cards: Card[]): string[] {
  const ids = new Set<string>()
  for (const card of cards) {
    for (const id of card.content.images) ids.add(id)
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
  await withStorageTimeout(`upload ${mediaId}`, () =>
    uploadBytes(ref(storage, mediaStoragePath(uid, mediaId)), blob, {
      contentType: blob.type || "application/octet-stream",
    }),
  )
}

export async function downloadMediaFromRemote(
  uid: string,
  mediaId: string,
): Promise<Blob | null> {
  const storage = getFirebaseStorage()
  if (!storage) return null
  try {
    const bytes = await withStorageTimeout(`download ${mediaId}`, () =>
      getBytes(ref(storage, mediaStoragePath(uid, mediaId))),
    )
    const row = await db.media.get(mediaId)
    const mimeType = row?.mimeType ?? "application/octet-stream"
    return new Blob([bytes], { type: mimeType })
  } catch (e) {
    if (isLikelyStorageCorsError(e)) {
      syncLog(
        "Storage download blocked by CORS — apply storage.cors.json to your bucket (see docs/FIREBASE.md)",
        { mediaId },
      )
    }
    return null
  }
}

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
    await uploadMediaBlob(storage, uid, row)
  }
}

/** Pull Storage blobs for every image id referenced by cards (for review UI). */
export async function hydrateReferencedMedia(
  uid: string,
): Promise<{ total: number; pulled: number; alreadyLocal: number; failed: number }> {
  const cards = await db.cards.toArray()
  const ids = new Set<string>()
  for (const card of cards) {
    for (const id of card.content.images) ids.add(id)
  }

  let pulled = 0
  let alreadyLocal = 0
  let failed = 0

  for (const id of ids) {
    const local = await db.media.get(id)
    if (local?.blob && local.blob.size > 0) {
      alreadyLocal++
      continue
    }
    try {
      const blob = await downloadMediaFromRemote(uid, id)
      if (!blob || blob.size === 0) {
        failed++
        continue
      }
      await db.media.put({
        id,
        blob,
        mimeType: local?.mimeType ?? blob.type ?? "image/jpeg",
        updatedAt: Date.now(),
      })
      pulled++
    } catch {
      failed++
    }
  }

  return { total: ids.size, pulled, alreadyLocal, failed }
}

export async function pullRemoteMediaToLocal(
  uid: string,
  cards: Card[],
): Promise<void> {
  const storage = getFirebaseStorage()
  if (!storage) return
  const ids = collectMediaIdsFromCards(cards)
  const now = Date.now()
  for (const mediaId of ids) {
    const local = await db.media.get(mediaId)
    if (local) continue
    const blob = await downloadMediaFromRemote(uid, mediaId)
    if (!blob) continue
    await db.media.put({
      id: mediaId,
      blob,
      mimeType: blob.type || "application/octet-stream",
      updatedAt: now,
    })
  }
}

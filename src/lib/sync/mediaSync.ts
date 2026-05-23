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
import { withStorageTimeout } from "./storageTimeout"
import type { RemoteMediaMeta } from "./syncTypes"

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
  } catch {
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

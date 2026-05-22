import {
  deleteObject,
  getBlob,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage"
import type { MediaRow } from "../db/schema"
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
  await uploadBytes(ref(storage, path), row.blob, {
    contentType: row.mimeType,
  })
}

export async function downloadMediaBlob(
  storage: FirebaseStorage,
  uid: string,
  meta: RemoteMediaMeta,
): Promise<MediaRow> {
  const path = mediaStoragePath(uid, meta.id)
  const blob = await getBlob(ref(storage, path))
  return {
    id: meta.id,
    blob,
    mimeType: meta.mimeType,
    updatedAt: meta.updatedAt,
  }
}

export async function deleteMediaBlob(
  storage: FirebaseStorage,
  uid: string,
  mediaId: string,
): Promise<void> {
  await deleteObject(ref(storage, mediaStoragePath(uid, mediaId)))
}

export function mediaPreviewUrl(row: MediaRow): string {
  return URL.createObjectURL(row.blob)
}

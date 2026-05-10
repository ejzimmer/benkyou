import { db } from "../lib/db/schema"
import { newId } from "../lib/db/id"

export async function saveImageBlob(blob: Blob): Promise<string> {
  const id = newId()
  await db.media.put({
    id,
    blob,
    mimeType: blob.type || "image/png",
  })
  return id
}

export async function getImageUrl(mediaId: string): Promise<string | null> {
  const row = await db.media.get(mediaId)
  if (!row) return null
  return URL.createObjectURL(row.blob)
}

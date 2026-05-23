import type { User } from "firebase/auth"
import { db } from "../lib/db/schema"
import type { BulkImportPayload } from "../lib/import/types"
import { pushLocalMediaToRemote } from "../lib/sync/mediaSync"
import { pushCardRemote, pushSchedulingRemote } from "./decks"
import { getFirestoreDb } from "../lib/firebase"
import { upsertDeckRemote } from "../lib/sync/firestoreSync"

function mediaItemBytes(item: BulkImportPayload["media"][number]): Uint8Array {
  if (item.bytes) return item.bytes
  if (item.base64) {
    const binary = atob(item.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  throw new Error(`Media ${item.id} has no bytes or base64`)
}

export async function applyBulkImport(
  payload: BulkImportPayload,
  user: User | null,
): Promise<void> {
  await db.transaction(
    "rw",
    db.decks,
    db.cards,
    db.scheduling,
    db.media,
    async () => {
      await db.decks.put(payload.deck)
      for (const item of payload.media) {
        const bytes = mediaItemBytes(item)
        await db.media.put({
          id: item.id,
          blob: new Blob([bytes], { type: item.mimeType }),
          mimeType: item.mimeType,
          updatedAt: Date.now(),
        })
      }
      for (const card of payload.cards) {
        await db.cards.put(card)
      }
      for (const row of payload.scheduling) {
        await db.scheduling.put(row)
      }
    },
  )

  if (!user) return

  const fs = getFirestoreDb()
  if (fs) await upsertDeckRemote(fs, user.uid, payload.deck)

  for (const card of payload.cards) {
    await pushCardRemote(user, card.id)
  }
  for (const row of payload.scheduling) {
    await pushSchedulingRemote(user, row.id)
  }
  await pushLocalMediaToRemote(user.uid, payload.cards)
}

import type { Deck } from "../domain/types"
import { db } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import { upsertCardRemote, upsertSchedulingRemote } from "../lib/sync/firestoreSync"
import { getFirestoreDb } from "../lib/firebase"
import { recordTombstone } from "../lib/sync/tombstones"
import {
  getSessionEditedCardIds,
  removeSessionEditedCardIds,
} from "../lib/sync/sessionEdits"
import type { User } from "firebase/auth"

export async function createDeck(name: string): Promise<Deck> {
  const now = Date.now()
  const deck: Deck = { id: newId(), name, updatedAt: now }
  await db.decks.put(deck)
  return deck
}

export async function saveDeck(deck: Deck): Promise<void> {
  const updated = { ...deck, updatedAt: Date.now() }
  await db.decks.put(updated)
}

export async function deleteDeck(deckId: string): Promise<void> {
  const now = Date.now()
  const cards = await db.cards.where("deckId").equals(deckId).toArray()
  for (const c of cards) {
    for (const imgId of c.content.images) {
      await recordTombstone("media", imgId, now)
    }
    const sched = await db.scheduling.where("cardId").equals(c.id).toArray()
    for (const row of sched) {
      await recordTombstone("scheduling", row.id, now)
    }
    await recordTombstone("card", c.id, now)
  }
  await recordTombstone("deck", deckId, now)

  await db.transaction(
    "rw",
    [db.decks, db.cards, db.scheduling, db.reviewEvents, db.media],
    async () => {
      await db.decks.delete(deckId)
      for (const c of cards) {
        await db.cards.delete(c.id)
        await db.scheduling.where("cardId").equals(c.id).delete()
        for (const imgId of c.content.images) {
          await db.media.delete(imgId)
        }
      }
    },
  )
}

export async function pushCardRemote(user: User | null, cardId: string) {
  const fs = getFirestoreDb()
  if (!fs || !user) return
  const card = await db.cards.get(cardId)
  if (card) await upsertCardRemote(fs, user.uid, card)
}

export async function pushSchedulingRemote(user: User | null, rowId: string) {
  const fs = getFirestoreDb()
  if (!fs || !user) return
  const row = await db.scheduling.get(rowId)
  if (row) await upsertSchedulingRemote(fs, user.uid, row)
}

export async function pushAllSchedulingForCard(
  user: User | null,
  cardId: string,
): Promise<void> {
  const rows = await db.scheduling.where("cardId").equals(cardId).toArray()
  for (const row of rows) {
    await pushSchedulingRemote(user, row.id)
  }
}

/**
 * Push every card edited/created this session straight to Firestore, no
 * merge or conflict check — the "Sync edits" button's contract is "use this
 * device's version," so whatever's local simply overwrites remote.
 */
export async function pushSessionEditsNow(user: User | null): Promise<void> {
  const cardIds = getSessionEditedCardIds()
  for (const cardId of cardIds) {
    await pushCardRemote(user, cardId)
    await pushAllSchedulingForCard(user, cardId)
  }
  removeSessionEditedCardIds(cardIds)
}

import type { Deck } from "../domain/types"
import { db } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import {
  deleteCardRemote,
  deleteDeckRemote,
  deleteSchedulingRemote,
  upsertCardRemote,
  upsertDeckRemote,
  upsertSchedulingRemote,
} from "../lib/sync/firestoreSync"
import { getFirestoreDb } from "../lib/firebase"
import { schedulePushAfterMutation } from "../lib/sync/schedulePush"
import { recordTombstone } from "../lib/sync/tombstones"
import type { User } from "firebase/auth"

export async function createDeck(
  name: string,
  user: User | null,
): Promise<Deck> {
  const now = Date.now()
  const deck: Deck = { id: newId(), name, updatedAt: now }
  await db.decks.put(deck)
  const fs = getFirestoreDb()
  if (fs && user) await upsertDeckRemote(fs, user.uid, deck)
  schedulePushAfterMutation(user)
  return deck
}

export async function saveDeck(deck: Deck, user: User | null): Promise<void> {
  const updated = { ...deck, updatedAt: Date.now() }
  await db.decks.put(updated)
  const fs = getFirestoreDb()
  if (fs && user) await upsertDeckRemote(fs, user.uid, updated)
  schedulePushAfterMutation(user)
}

export async function deleteDeck(deckId: string, user: User | null): Promise<void> {
  const now = Date.now()
  const cards = await db.cards.where("deckId").equals(deckId).toArray()
  const schedToRemove: { cardId: string; id: string }[] = []
  for (const c of cards) {
    for (const imgId of c.content.images) {
      await recordTombstone("media", imgId, now)
    }
    const sched = await db.scheduling.where("cardId").equals(c.id).toArray()
    for (const row of sched) {
      await recordTombstone("scheduling", row.id, now)
      schedToRemove.push({ cardId: c.id, id: row.id })
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

  const fs = getFirestoreDb()
  if (fs && user) {
    await deleteDeckRemote(fs, user.uid, deckId)
    for (const c of cards) {
      await deleteCardRemote(fs, user.uid, c.id)
      const sched = await db.scheduling.where("cardId").equals(c.id).toArray()
      for (const row of sched) {
        await deleteSchedulingRemote(fs, user.uid, row.id)
      }
    }
  }
  schedulePushAfterMutation(user)
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

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
  // Awaited: DeckListPage.onCreate relies on a rejection here surfacing as a
  // create error rather than navigating to a deck that never synced.
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
    // Best-effort: don't let a failed remote call (offline, transient error)
    // skip scheduling the safety-net push below — that push reconciles
    // straight from tombstones and is what actually guarantees the deck
    // doesn't come back on another device.
    try {
      await deleteDeckRemote(fs, user.uid, deckId)
      for (const c of cards) {
        await deleteCardRemote(fs, user.uid, c.id)
      }
      for (const { id } of schedToRemove) {
        await deleteSchedulingRemote(fs, user.uid, id)
      }
    } catch (e) {
      console.error("Failed to delete deck remotely, relying on safety-net push:", e)
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

import type { Deck } from "../domain/types"
import { db } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import {
  upsertDeckRemote,
  upsertCardRemote,
  upsertSchedulingRemote,
} from "../lib/sync/firestoreSync"
import { getFirestoreDb } from "../lib/firebase"
import type { User } from "firebase/auth"

export async function createDeck(name: string): Promise<Deck> {
  const now = Date.now()
  const deck: Deck = { id: newId(), name, updatedAt: now }
  await db.decks.put(deck)
  return deck
}

export async function saveDeck(deck: Deck, user: User | null): Promise<void> {
  const updated = { ...deck, updatedAt: Date.now() }
  await db.decks.put(updated)
  const fs = getFirestoreDb()
  if (fs && user) await upsertDeckRemote(fs, user.uid, updated)
}

export async function deleteDeck(deckId: string): Promise<void> {
  await db.transaction(
    "rw",
    db.decks,
    db.cards,
    db.scheduling,
    db.reviewEvents,
    async () => {
      await db.decks.delete(deckId)
      const cards = await db.cards.where("deckId").equals(deckId).toArray()
      for (const c of cards) {
        await db.cards.delete(c.id)
        await db.scheduling.where("cardId").equals(c.id).delete()
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

import {
  collection,
  doc,
  getDocs,
  runTransaction,
  setDoc,
  type Firestore,
} from "firebase/firestore"
import type { Card, Deck } from "../../domain/types"
import type { SchedulingRow } from "../db/schema"
import { db } from "../db/schema"

const decksCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "decks")
const cardsCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "cards")
const schedCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "scheduling")

export async function pushLocalToRemote(
  fs: Firestore,
  uid: string,
): Promise<void> {
  const [localDecks, localCards, localSched] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.scheduling.toArray(),
  ])

  await runTransaction(fs, async (tx) => {
    for (const d of localDecks) {
      tx.set(doc(decksCol(fs, uid), d.id), d)
    }
    for (const c of localCards) {
      tx.set(doc(cardsCol(fs, uid), c.id), {
        ...c,
        content: c.content,
      })
    }
    for (const s of localSched) {
      tx.set(doc(schedCol(fs, uid), s.id), s)
    }
  })
}

export async function pullRemoteToLocal(
  fs: Firestore,
  uid: string,
): Promise<void> {
  const snapDecks = await getDocs(decksCol(fs, uid))
  const snapCards = await getDocs(cardsCol(fs, uid))
  const snapSched = await getDocs(schedCol(fs, uid))

  await db.transaction("rw", db.decks, db.cards, db.scheduling, async () => {
    for (const d of snapDecks.docs) {
      const data = d.data() as Deck
      const local = await db.decks.get(d.id)
      if (!local || data.updatedAt >= local.updatedAt) {
        await db.decks.put(data)
      }
    }
    for (const d of snapCards.docs) {
      const data = d.data() as Card
      const local = await db.cards.get(d.id)
      if (!local || data.updatedAt >= local.updatedAt) {
        await db.cards.put(data)
      }
    }
    for (const d of snapSched.docs) {
      const data = d.data() as SchedulingRow
      const local = await db.scheduling.get(d.id)
      if (!local || data.updatedAt >= local.updatedAt) {
        await db.scheduling.put(data)
      }
    }
  })
}

export async function upsertDeckRemote(
  fs: Firestore,
  uid: string,
  deck: Deck,
): Promise<void> {
  await setDoc(doc(decksCol(fs, uid), deck.id), deck)
}

export async function upsertCardRemote(
  fs: Firestore,
  uid: string,
  card: Card,
): Promise<void> {
  await setDoc(doc(cardsCol(fs, uid), card.id), card as Record<string, unknown>)
}

export async function upsertSchedulingRemote(
  fs: Firestore,
  uid: string,
  row: SchedulingRow,
): Promise<void> {
  await setDoc(doc(schedCol(fs, uid), row.id), row)
}

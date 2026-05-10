import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
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

/** Firestore batch limit is 500 operations; stay under for headroom. */
const BATCH_SIZE = 400

export async function pushLocalToRemote(
  fs: Firestore,
  uid: string,
): Promise<void> {
  const [localDecks, localCards, localSched] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.scheduling.toArray(),
  ])

  let batch = writeBatch(fs)
  let n = 0

  const enqueue = async (ref: ReturnType<typeof doc>, data: object) => {
    batch.set(ref, data)
    n++
    if (n >= BATCH_SIZE) {
      await batch.commit()
      batch = writeBatch(fs)
      n = 0
    }
  }

  for (const d of localDecks) {
    await enqueue(doc(decksCol(fs, uid), d.id), d)
  }
  for (const c of localCards) {
    await enqueue(doc(cardsCol(fs, uid), c.id), {
      ...c,
      content: c.content,
    })
  }
  for (const s of localSched) {
    await enqueue(doc(schedCol(fs, uid), s.id), s)
  }
  if (n > 0) await batch.commit()
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

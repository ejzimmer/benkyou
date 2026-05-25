import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore"
import type { Card, Deck } from "../../domain/types"
import type { MediaRow, SchedulingRow } from "../db/schema"
import { db } from "../db/schema"
import type { RemoteMediaMeta, Tombstone } from "./syncTypes"
import { stripUndefinedDeep } from "./firestoreData"
import { syncLog, syncLogTimed } from "./syncLog"

const BATCH_SIZE = 400

const decksCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "decks")
const cardsCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "cards")
const schedCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "scheduling")
const tombstonesCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "tombstones")
const mediaMetaCol = (fs: Firestore, uid: string) =>
  collection(fs, "users", uid, "media")

export type RemoteSnapshot = {
  decks: Map<string, Deck>
  cards: Map<string, Card>
  scheduling: Map<string, SchedulingRow>
  tombstones: Map<string, Tombstone>
  mediaMeta: Map<string, RemoteMediaMeta>
}

export async function fetchRemoteSnapshot(
  fs: Firestore,
  uid: string,
  phase = "pull",
): Promise<RemoteSnapshot> {
  syncLog("fetchRemoteSnapshot", { uid, phase })
  const label = (collection: string) =>
    `Firestore getDocs ${collection} (${phase})`
  const [snapDecks, snapCards, snapSched, snapTombs, snapMedia] =
    await Promise.all([
      syncLogTimed(label("decks"), () => getDocs(decksCol(fs, uid))),
      syncLogTimed(label("cards"), () => getDocs(cardsCol(fs, uid))),
      syncLogTimed(label("scheduling"), () =>
        getDocs(schedCol(fs, uid)),
      ),
      syncLogTimed(label("tombstones"), () =>
        getDocs(tombstonesCol(fs, uid)),
      ),
      syncLogTimed(label("media meta"), () =>
        getDocs(mediaMetaCol(fs, uid)),
      ),
    ])

  const decks = new Map<string, Deck>()
  for (const d of snapDecks.docs) decks.set(d.id, d.data() as Deck)

  const cards = new Map<string, Card>()
  for (const d of snapCards.docs) cards.set(d.id, d.data() as Card)

  const scheduling = new Map<string, SchedulingRow>()
  for (const d of snapSched.docs)
    scheduling.set(d.id, d.data() as SchedulingRow)

  const tombstones = new Map<string, Tombstone>()
  for (const d of snapTombs.docs) tombstones.set(d.id, d.data() as Tombstone)

  const mediaMeta = new Map<string, RemoteMediaMeta>()
  for (const d of snapMedia.docs)
    mediaMeta.set(d.id, d.data() as RemoteMediaMeta)

  const summary = {
    decks: decks.size,
    cards: cards.size,
    scheduling: scheduling.size,
    tombstones: tombstones.size,
    mediaMeta: mediaMeta.size,
  }
  syncLog("fetchRemoteSnapshot complete", summary)
  return { decks, cards, scheduling, tombstones, mediaMeta }
}

async function commitBatch(
  fs: Firestore,
  ops: Array<{ ref: ReturnType<typeof doc>; data: object }>,
): Promise<void> {
  let batch = writeBatch(fs)
  let n = 0
  for (const { ref, data } of ops) {
    batch.set(ref, stripUndefinedDeep(data))
    n++
    if (n >= BATCH_SIZE) {
      await batch.commit()
      batch = writeBatch(fs)
      n = 0
    }
  }
  if (n > 0) await batch.commit()
}

export async function pushLocalToRemote(
  fs: Firestore,
  uid: string,
  remote?: RemoteSnapshot,
): Promise<void> {
  syncLog("pushLocalToRemote", { uid })
  const [localDecks, localCards, localSched, localTombs, localMedia] =
    await Promise.all([
      db.decks.toArray(),
      db.cards.toArray(),
      db.scheduling.toArray(),
      db.tombstones.toArray(),
      db.media.toArray(),
    ])

  const sets: Array<{ ref: ReturnType<typeof doc>; data: object }> = []

  for (const d of localDecks) {
    sets.push({ ref: doc(decksCol(fs, uid), d.id), data: d })
  }
  for (const c of localCards) {
    sets.push({
      ref: doc(cardsCol(fs, uid), c.id),
      data: c as Record<string, unknown>,
    })
  }
  for (const s of localSched) {
    sets.push({ ref: doc(schedCol(fs, uid), s.id), data: s })
  }
  for (const t of localTombs) {
    sets.push({ ref: doc(tombstonesCol(fs, uid), t.id), data: t })
  }
  for (const m of localMedia) {
    sets.push({
      ref: doc(mediaMetaCol(fs, uid), m.id),
      data: { id: m.id, mimeType: m.mimeType, updatedAt: m.updatedAt },
    })
  }

  syncLog("pushLocalToRemote upsert batch", {
    decks: localDecks.length,
    cards: localCards.length,
    scheduling: localSched.length,
    tombstones: localTombs.length,
    mediaMeta: localMedia.length,
  })
  await syncLogTimed("Firestore commit upserts", () => commitBatch(fs, sets))

  const tombstoned = new Set(localTombs.map((t) => t.id))

  const deleteOps: ReturnType<typeof doc>[] = []
  const remoteSnapshot =
    remote ??
    (await syncLogTimed("fetchRemoteSnapshot (push-deletes)", () =>
      fetchRemoteSnapshot(fs, uid, "push-deletes"),
    ))

  for (const id of remoteSnapshot.decks.keys()) {
    const tid = `deck:${id}`
    if (!localDecks.some((d) => d.id === id) || tombstoned.has(tid)) {
      deleteOps.push(doc(decksCol(fs, uid), id))
    }
  }
  for (const id of remoteSnapshot.cards.keys()) {
    const tid = `card:${id}`
    if (!localCards.some((c) => c.id === id) || tombstoned.has(tid)) {
      deleteOps.push(doc(cardsCol(fs, uid), id))
    }
  }
  for (const id of remoteSnapshot.scheduling.keys()) {
    const tid = `scheduling:${id}`
    if (!localSched.some((s) => s.id === id) || tombstoned.has(tid)) {
      deleteOps.push(doc(schedCol(fs, uid), id))
    }
  }
  for (const id of remoteSnapshot.mediaMeta.keys()) {
    const tid = `media:${id}`
    if (!localMedia.some((m) => m.id === id) || tombstoned.has(tid)) {
      deleteOps.push(doc(mediaMetaCol(fs, uid), id))
    }
  }
  const localTombIds = new Set(localTombs.map((t) => t.id))
  for (const id of remoteSnapshot.tombstones.keys()) {
    if (!localTombIds.has(id)) {
      deleteOps.push(doc(tombstonesCol(fs, uid), id))
    }
  }

  syncLog("pushLocalToRemote deletes", { count: deleteOps.length })
  for (let i = 0; i < deleteOps.length; i += BATCH_SIZE) {
    const batch = writeBatch(fs)
    for (const ref of deleteOps.slice(i, i + BATCH_SIZE)) batch.delete(ref)
    await syncLogTimed(`Firestore commit deletes ${i}`, () => batch.commit())
  }
  syncLog("pushLocalToRemote complete")
}

export async function upsertDeckRemote(
  fs: Firestore,
  uid: string,
  deck: Deck,
): Promise<void> {
  await setDoc(doc(decksCol(fs, uid), deck.id), stripUndefinedDeep(deck))
}

export async function upsertCardRemote(
  fs: Firestore,
  uid: string,
  card: Card,
): Promise<void> {
  await setDoc(
    doc(cardsCol(fs, uid), card.id),
    stripUndefinedDeep(card as Record<string, unknown>),
  )
}

export async function upsertSchedulingRemote(
  fs: Firestore,
  uid: string,
  row: SchedulingRow,
): Promise<void> {
  await setDoc(doc(schedCol(fs, uid), row.id), stripUndefinedDeep(row))
}

export async function upsertTombstoneRemote(
  fs: Firestore,
  uid: string,
  tombstone: Tombstone,
): Promise<void> {
  await setDoc(
    doc(tombstonesCol(fs, uid), tombstone.id),
    stripUndefinedDeep(tombstone),
  )
}

export async function upsertMediaMetaRemote(
  fs: Firestore,
  uid: string,
  row: MediaRow,
): Promise<void> {
  await setDoc(
    doc(mediaMetaCol(fs, uid), row.id),
    stripUndefinedDeep({
      id: row.id,
      mimeType: row.mimeType,
      updatedAt: row.updatedAt,
    }),
  )
}

export async function deleteDeckRemote(
  fs: Firestore,
  uid: string,
  deckId: string,
): Promise<void> {
  await deleteDoc(doc(decksCol(fs, uid), deckId))
}

export async function deleteCardRemote(
  fs: Firestore,
  uid: string,
  cardId: string,
): Promise<void> {
  await deleteDoc(doc(cardsCol(fs, uid), cardId))
}

export async function deleteSchedulingRemote(
  fs: Firestore,
  uid: string,
  schedulingId: string,
): Promise<void> {
  await deleteDoc(doc(schedCol(fs, uid), schedulingId))
}

export async function deleteMediaMetaRemote(
  fs: Firestore,
  uid: string,
  mediaId: string,
): Promise<void> {
  await deleteDoc(doc(mediaMetaCol(fs, uid), mediaId))
}

export async function deleteTombstoneRemote(
  fs: Firestore,
  uid: string,
  tombstoneId: string,
): Promise<void> {
  await deleteDoc(doc(tombstonesCol(fs, uid), tombstoneId))
}

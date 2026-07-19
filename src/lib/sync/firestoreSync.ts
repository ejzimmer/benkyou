import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore"
import type { Card, Deck } from "../../domain/types"
import type { MediaRow, SchedulingRow } from "../db/schema"
import { db } from "../db/schema"
import type { RemoteMediaMeta, Tombstone } from "./syncTypes"
import { stableCompareJson, stripUndefinedDeep } from "./firestoreData"
import { syncLog, syncLogTimed } from "./syncLog"
import { cardChanged, deckChanged, mediaChanged, schedulingChanged } from "./syncCompare"
import { yieldPeriodically } from "../yieldToMain"

const BATCH_SIZE = 400

/** Firestore doc id is canonical; body `id` may be missing or stale after manual edits. */
function withDocId<T extends { id?: string }>(docId: string, data: T): T & { id: string } {
  return { ...data, id: docId }
}

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
  for (let i = 0; i < snapDecks.docs.length; i++) {
    await yieldPeriodically(i)
    const d = snapDecks.docs[i]
    decks.set(d.id, withDocId(d.id, d.data() as Deck))
  }

  const cards = new Map<string, Card>()
  for (let i = 0; i < snapCards.docs.length; i++) {
    await yieldPeriodically(i)
    const d = snapCards.docs[i]
    cards.set(d.id, withDocId(d.id, d.data() as Card))
  }

  const scheduling = new Map<string, SchedulingRow>()
  for (let i = 0; i < snapSched.docs.length; i++) {
    await yieldPeriodically(i)
    const d = snapSched.docs[i]
    scheduling.set(d.id, withDocId(d.id, d.data() as SchedulingRow))
  }

  const tombstones = new Map<string, Tombstone>()
  for (let i = 0; i < snapTombs.docs.length; i++) {
    await yieldPeriodically(i)
    const d = snapTombs.docs[i]
    tombstones.set(d.id, withDocId(d.id, d.data() as Tombstone))
  }

  const mediaMeta = new Map<string, RemoteMediaMeta>()
  for (let i = 0; i < snapMedia.docs.length; i++) {
    await yieldPeriodically(i)
    const d = snapMedia.docs[i]
    mediaMeta.set(d.id, withDocId(d.id, d.data() as RemoteMediaMeta))
  }

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

/**
 * Cheap "did anything change remotely since my last sync" check: one
 * `limit(1)` existence query per collection instead of downloading every
 * document. Lets `runFullSync` skip the full 5-collection fetch entirely on
 * a steady-state resync (nothing changed anywhere), which is the common
 * case and was otherwise paying a multi-second network round trip for data
 * that turns out to be identical to what's already local.
 *
 * Tombstones are checked by `deletedAt` (their own timestamp field) — a
 * deletion never updates the deleted entity's own collection, only creates
 * or refreshes a tombstone doc, so this is the only way remote deletions
 * show up here.
 */
export async function hasAnyRemoteChangesSince(
  fs: Firestore,
  uid: string,
  sinceMs: number,
): Promise<boolean> {
  const checks: Array<[string, ReturnType<typeof collection>, string]> = [
    ["decks", decksCol(fs, uid), "updatedAt"],
    ["cards", cardsCol(fs, uid), "updatedAt"],
    ["scheduling", schedCol(fs, uid), "updatedAt"],
    ["tombstones", tombstonesCol(fs, uid), "deletedAt"],
    ["media meta", mediaMetaCol(fs, uid), "updatedAt"],
  ]
  const results = await Promise.all(
    checks.map(([label, col, field]) =>
      syncLogTimed(`Firestore changed-since check ${label}`, async () => {
        const snap = await getDocs(query(col, where(field, ">", sinceMs), limit(1)))
        return snap.docs.length > 0
      }),
    ),
  )
  return results.some(Boolean)
}

/**
 * `hasAnyRemoteChangesSince` can only see a *new or updated* timestamp — it
 * can't see a document that's simply gone. Deleting a deck removes it (and
 * its cards/scheduling) locally and records a tombstone immediately, but
 * neither the deletion nor the tombstone reaches Firestore until the user
 * next explicitly pushes (Sync now / Upload changes / Sync edits) — on
 * another device, that's a window where an entity has vanished from remote
 * with no trace of why yet. A plain document count (via Firestore's
 * count aggregation, not a full fetch) catches that: if remote now has
 * fewer decks/cards/scheduling than this device believes exist, something
 * disappeared without a tombstone, and the full sync must run to find out
 * what (and not resurrect it via `pushLocalToRemote`).
 *
 * Only meaningful once the timestamp check has already come back clean —
 * if local has unsynced changes, or remote has newer timestamps, the full
 * sync already runs regardless of counts.
 *
 * Deliberately a strict "remote < local" check, not "remote !== local":
 * remote having *more* docs than local believes exist is a normal, benign
 * state for media specifically — `syncMedia` only ever downloads media
 * referenced by a local card (or already local), so a media doc that's no
 * longer referenced by any card (e.g. after removing an image from a card)
 * stays on remote, unfetched, until the next push sweeps it up as an
 * orphan. Flagging that as a "mismatch" would force the full, expensive
 * snapshot pull on essentially every sync for any account that has ever
 * edited a card's images, defeating the short-circuit permanently. A
 * genuine silent deletion always shows up as remote having *fewer* docs
 * than local, which this still catches.
 */
export async function hasEntityCountMismatch(
  fs: Firestore,
  uid: string,
): Promise<boolean> {
  const checks: Array<
    [string, ReturnType<typeof collection>, () => Promise<number>]
  > = [
    ["decks", decksCol(fs, uid), () => db.decks.count()],
    ["cards", cardsCol(fs, uid), () => db.cards.count()],
    ["scheduling", schedCol(fs, uid), () => db.scheduling.count()],
    ["media meta", mediaMetaCol(fs, uid), () => db.media.count()],
  ]
  const results = await Promise.all(
    checks.map(([label, col, localCount]) =>
      syncLogTimed(`Firestore count check ${label}`, async () => {
        const [remoteSnap, local] = await Promise.all([
          getCountFromServer(col),
          localCount(),
        ])
        return remoteSnap.data().count < local
      }),
    ),
  )
  return results.some(Boolean)
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

type BatchWriteOp =
  | { kind: "set"; ref: ReturnType<typeof doc>; data: object }
  | { kind: "delete"; ref: ReturnType<typeof doc> }

async function commitOpsBatched(
  fs: Firestore,
  ops: BatchWriteOp[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = ops.length
  let done = 0
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const chunk = ops.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(fs)
    for (const op of chunk) {
      if (op.kind === "set") batch.set(op.ref, stripUndefinedDeep(op.data))
      else batch.delete(op.ref)
    }
    await batch.commit()
    done += chunk.length
    onProgress?.(done, total)
  }
}

/**
 * Push a freshly-imported deck (and clear its stale tombstones) in a
 * handful of batched commits instead of one Firestore round trip per card
 * and scheduling row — pushed one doc at a time, a few hundred cards can
 * take many minutes on a slow connection with long gaps between progress
 * updates that look like the import has stalled.
 */
export async function pushImportedDeckBatched(
  fs: Firestore,
  uid: string,
  deck: Deck,
  cards: Card[],
  scheduling: SchedulingRow[],
  tombstoneIdsToClear: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const ops: BatchWriteOp[] = [
    { kind: "set", ref: doc(decksCol(fs, uid), deck.id), data: deck },
    ...cards.map((c) => ({
      kind: "set" as const,
      ref: doc(cardsCol(fs, uid), c.id),
      data: c as Record<string, unknown>,
    })),
    ...scheduling.map((s) => ({
      kind: "set" as const,
      ref: doc(schedCol(fs, uid), s.id),
      data: s,
    })),
    ...tombstoneIdsToClear.map((id) => ({
      kind: "delete" as const,
      ref: doc(tombstonesCol(fs, uid), id),
    })),
  ]
  await commitOpsBatched(fs, ops, onProgress)
}

function mediaMetaPayload(m: MediaRow) {
  return { id: m.id, mimeType: m.mimeType, updatedAt: m.updatedAt, digest: m.digest }
}

/** Tombstones have no dedicated payload comparator (they're small and rarely
 *  churn), so fall back to a raw deep-equality check. */
function unchanged<T>(local: T, remote: T | undefined): boolean {
  return remote != null && stableCompareJson(local, remote)
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

  // Fetched up front (rather than only for the delete sweep below) so the
  // upserts below can skip anything that already matches what's remote —
  // most rows on any given push are untouched since the last one.
  const remoteSnapshot =
    remote ??
    (await syncLogTimed("fetchRemoteSnapshot (push)", () =>
      fetchRemoteSnapshot(fs, uid, "push"),
    ))

  const sets: Array<{ ref: ReturnType<typeof doc>; data: object }> = []
  let skipped = 0

  for (let i = 0; i < localDecks.length; i++) {
    await yieldPeriodically(i)
    const d = localDecks[i]
    const remoteDeck = remoteSnapshot.decks.get(d.id)
    if (remoteDeck && !deckChanged(d, remoteDeck)) {
      skipped++
      continue
    }
    sets.push({ ref: doc(decksCol(fs, uid), d.id), data: d })
  }
  for (let i = 0; i < localCards.length; i++) {
    await yieldPeriodically(i)
    const c = localCards[i]
    const remoteCard = remoteSnapshot.cards.get(c.id)
    if (remoteCard && !cardChanged(c, remoteCard)) {
      skipped++
      continue
    }
    sets.push({
      ref: doc(cardsCol(fs, uid), c.id),
      data: c as Record<string, unknown>,
    })
  }
  for (let i = 0; i < localSched.length; i++) {
    await yieldPeriodically(i)
    const s = localSched[i]
    const remoteRow = remoteSnapshot.scheduling.get(s.id)
    if (remoteRow && !schedulingChanged(s, remoteRow)) {
      skipped++
      continue
    }
    sets.push({ ref: doc(schedCol(fs, uid), s.id), data: s })
  }
  for (let i = 0; i < localTombs.length; i++) {
    await yieldPeriodically(i)
    const t = localTombs[i]
    if (unchanged(t, remoteSnapshot.tombstones.get(t.id))) {
      skipped++
      continue
    }
    sets.push({ ref: doc(tombstonesCol(fs, uid), t.id), data: t })
  }
  for (let i = 0; i < localMedia.length; i++) {
    await yieldPeriodically(i)
    const m = localMedia[i]
    const remoteMeta = remoteSnapshot.mediaMeta.get(m.id)
    if (
      remoteMeta?.digest &&
      m.digest &&
      !mediaChanged(m, remoteMeta, m.digest, remoteMeta.digest)
    ) {
      skipped++
      continue
    }
    sets.push({
      ref: doc(mediaMetaCol(fs, uid), m.id),
      data: mediaMetaPayload(m),
    })
  }

  syncLog("pushLocalToRemote upsert batch", {
    decks: localDecks.length,
    cards: localCards.length,
    scheduling: localSched.length,
    tombstones: localTombs.length,
    mediaMeta: localMedia.length,
    toWrite: sets.length,
    skippedUnchanged: skipped,
  })
  await syncLogTimed("Firestore commit upserts", () => commitBatch(fs, sets))

  const tombstoned = new Set(localTombs.map((t) => t.id))
  const localDeckIds = new Set(localDecks.map((d) => d.id))
  const localCardIds = new Set(localCards.map((c) => c.id))
  const localSchedIds = new Set(localSched.map((s) => s.id))
  const localMediaIds = new Set(localMedia.map((m) => m.id))

  const deleteOps: ReturnType<typeof doc>[] = []

  for (const id of remoteSnapshot.decks.keys()) {
    const tid = `deck:${id}`
    if (!localDeckIds.has(id) || tombstoned.has(tid)) {
      deleteOps.push(doc(decksCol(fs, uid), id))
    }
  }
  for (const id of remoteSnapshot.cards.keys()) {
    const tid = `card:${id}`
    if (!localCardIds.has(id) || tombstoned.has(tid)) {
      deleteOps.push(doc(cardsCol(fs, uid), id))
    }
  }
  for (const id of remoteSnapshot.scheduling.keys()) {
    const tid = `scheduling:${id}`
    if (!localSchedIds.has(id) || tombstoned.has(tid)) {
      deleteOps.push(doc(schedCol(fs, uid), id))
    }
  }
  for (const id of remoteSnapshot.mediaMeta.keys()) {
    const tid = `media:${id}`
    if (!localMediaIds.has(id) || tombstoned.has(tid)) {
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
    stripUndefinedDeep(mediaMetaPayload(row)),
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

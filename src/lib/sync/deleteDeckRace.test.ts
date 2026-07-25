/**
 * @vitest-environment node
 *
 * Targeted reproduction of the TOCTOU race in `collectEntityConflicts`: it
 * snapshots local decks and tombstone ids once up front, decides a winner
 * for each from that snapshot, and only then writes it back via
 * `putIfNotStale`. If a concurrent `deleteDeck()` records a tombstone for a
 * deck *after* that up-front snapshot but *before* the loop reaches it, the
 * snapshot alone won't catch it — `putIfNotStale`'s own re-check (a fresh
 * tombstone lookup inside the transaction, right before the write) is what's
 * supposed to catch it instead, and must not blindly resurrect the deck.
 *
 * This simulates that gap using a second, unrelated deck ("deck-AAA", which
 * sorts before "deck-X" so `collectEntityConflicts` processes it first) as
 * a trigger: intercepting the live read `putIfNotStale` performs for
 * deck-AAA runs deleteDeck's tombstone-then-delete effect on deck-X (and its
 * card/scheduling row) as a side effect, landing it after the up-front
 * snapshot but before deck-X's own turn in the loop — mirroring a full sync
 * that raced ahead of an in-flight `deleteDeck()` on a slower device.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("firebase/firestore", async () => {
  const mod = await import("../../test/fakeFirebase")
  return {
    collection: mod.fakeCollection,
    doc: mod.fakeDoc,
    getDocs: mod.fakeGetDocs,
    query: mod.fakeQuery,
    where: mod.fakeWhere,
    limit: mod.fakeLimit,
    getCountFromServer: mod.fakeGetCountFromServer,
    setDoc: mod.fakeSetDoc,
    deleteDoc: mod.fakeDeleteDoc,
    writeBatch: mod.fakeWriteBatch,
  }
})

vi.mock("firebase/storage", async () => {
  const mod = await import("../../test/fakeFirebase")
  return {
    ref: mod.fakeRef,
    uploadBytes: mod.fakeUploadBytes,
    getBlob: mod.fakeGetBlob,
    getBytes: mod.fakeGetBytes,
    deleteObject: mod.fakeDeleteObject,
  }
})

vi.mock("../firebase", () => {
  const sentinelFs = { __fakeFirestore: true }
  const sentinelStorage = { __fakeStorage: true }
  return {
    isFirebaseConfigured: () => true,
    getFirebaseApp: () => ({}),
    getFirestoreDb: () => sentinelFs,
    getFirebaseStorage: () => sentinelStorage,
    warmFirebaseClients: () => {},
  }
})

import { db } from "../db/schema"
import { resetDatabase } from "../../test/db"
import { getFakeBackend, resetFakeBackend } from "../../test/fakeFirebase"
import { getFirebaseStorage, getFirestoreDb } from "../firebase"
import { applyBulkImport } from "../../services/bulkImport"
import { recordTombstone } from "./tombstones"
import { runFullSync, writeLastSyncedAt } from "./runSync"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "race-uid" } as unknown as import("firebase/auth").User

function twoDeckPayload(): BulkImportPayload {
  const now = Date.now()
  const fsrsCard = emptyFsrs()
  return {
    deck: { id: "deck-AAA", name: "Decoy deck", updatedAt: now },
    cards: [
      {
        id: "card-X",
        deckId: "deck-X",
        kind: "vocabulary",
        updatedAt: now,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          definitionsEn: ["cat"],
          images: [],
          exampleSentences: [],
        },
      },
    ],
    scheduling: [
      {
        id: "card-X:vocab_oral_en",
        cardId: "card-X",
        modeId: "vocab_oral_en",
        fsrs: serializeFsrs(fsrsCard),
        due: fsrsCard.due.getTime(),
        updatedAt: now,
      },
    ],
    media: [],
  }
}

function editRemoteDeck(uid: string, id: string, patch: object): void {
  const coll = getFakeBackend().firestore.docs.get(`users/${uid}/decks`)
  const current = coll?.get(id)
  coll?.set(id, { ...(current as object), ...patch })
}

describe("race: sync resurrects a deck mid-delete", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("does not resurrect the deck if deleteDeck races between the up-front snapshot and the loop reaching it", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(twoDeckPayload(), FAKE_USER)
    // deck-X isn't part of the bulk-import payload's own deck (that's
    // deck-AAA) — add it directly so both decks exist locally and remotely.
    await db.decks.put({ id: "deck-X", name: "Test deck", updatedAt: Date.now() })
    editRemoteDeck(FAKE_USER.uid, "deck-X", { id: "deck-X", name: "Test deck", updatedAt: Date.now() })

    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    // Another device's edit to both decks, newer than lastSyncedAt — forces
    // collectEntityConflicts to attempt a real write via putIfNotStale for
    // each (not skip either as unchanged). deck-AAA's edit is what gives us
    // a hook point inside the loop, before deck-X's own turn; deck-X's edit
    // is what makes deck-X's own iteration actually reach putIfNotStale
    // (otherwise "unchanged" would skip it before any write is attempted,
    // regardless of whether the race is properly guarded against).
    editRemoteDeck(FAKE_USER.uid, "deck-AAA", {
      name: "Decoy deck (renamed remotely)",
      updatedAt: Date.now() + 500,
    })
    editRemoteDeck(FAKE_USER.uid, "deck-X", {
      name: "Test deck (renamed remotely)",
      updatedAt: Date.now() + 500,
    })

    // putIfNotStale calls db.decks.get(local.id) to read the live row
    // immediately before writing, inside its own Dexie transaction scoped
    // to [tombstones, decks, cards, scheduling]. Intercepting it for
    // deck-AAA — processed before deck-X, since "deck-AAA" < "deck-X" —
    // lets us land a concurrent delete after collectEntityConflicts'
    // up-front snapshot but before deck-X's own turn in the loop. The
    // delete is done directly here (rather than via the real deleteDeck(),
    // which also touches reviewEvents/media) so it stays within that same
    // transaction's table scope, matching what deleteDeck does to the
    // tables this test actually cares about.
    const originalGet = db.decks.get.bind(db.decks)
    let deleteTriggered = false
    const spy = vi
      .spyOn(db.decks, "get")
      // @ts-expect-error -- overload signatures don't unify with a single mock impl
      .mockImplementation(async (key: string) => {
        if (key === "deck-AAA" && !deleteTriggered) {
          deleteTriggered = true
          await recordTombstone("card", "card-X")
          await recordTombstone("scheduling", "card-X:vocab_oral_en")
          await recordTombstone("deck", "deck-X")
          await db.cards.delete("card-X")
          await db.scheduling.delete("card-X:vocab_oral_en")
          await db.decks.delete("deck-X")
        }
        return originalGet(key)
      })

    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    // Sanity check this test actually landed the race where it's supposed
    // to (mockRestore() below clears call history, so this must run first).
    expect(spy).toHaveBeenCalledWith("deck-AAA")

    spy.mockRestore()

    expect(await db.decks.get("deck-X")).toBeUndefined()
    expect(await db.cards.get("card-X")).toBeUndefined()
  })
})

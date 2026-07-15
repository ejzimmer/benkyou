/**
 * @vitest-environment node
 *
 * Dedicated coverage for runFullSync's cheap "did anything change since my
 * last sync" short-circuit (the fix for "the app spends ages syncing every
 * time it loads, even with nothing to sync"). Full-collection downloads are
 * the dominant cost of a no-op resync at scale; this check replaces them
 * with a handful of tiny existence/count queries when it's safe to.
 *
 * "Safe to" is the point of this file: the fast path must positively rule
 * out every way remote or local could have moved, not just the common one
 * (a changed `updatedAt`). In particular, deleting an entity removes its
 * document immediately but only creates a tombstone via the debounced
 * safety-net push (`schedulePushAfterMutation`, up to 30s) — so a plain
 * timestamp check can't see a deletion that hasn't reached that point yet.
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
import { deleteDeckRemote } from "./firestoreSync"
import { runFullSync, writeLastSyncedAt } from "./runSync"
import { clearSyncLog, getSyncLogEntries } from "./syncLog"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "shortcircuit-uid" } as unknown as import(
  "firebase/auth"
).User

function tinyDeckPayload(now = Date.now()): BulkImportPayload {
  const fsrsCard = emptyFsrs()
  return {
    deck: { id: "deck-X", name: "Test deck", updatedAt: now },
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
          synonymsJa: [],
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

function ranFullPipeline(): boolean {
  return getSyncLogEntries().some((e) => e.step === "merge decks/cards/scheduling → start")
}

function skippedAsNoOp(): boolean {
  return getSyncLogEntries().some(
    (e) => e.step === "nothing changed on either side — skipping full sync",
  )
}

describe("runFullSync's no-op short-circuit", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("skips the full pipeline when nothing changed on either side", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    clearSyncLog()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    expect(skippedAsNoOp()).toBe(true)
    expect(ranFullPipeline()).toBe(false)
  })

  it("runs the full pipeline when another device changed something remotely", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    const coll = getFakeBackend().firestore.docs.get(`users/${FAKE_USER.uid}/decks`)
    const current = coll?.get("deck-X")
    coll?.set("deck-X", { ...(current as object), name: "Renamed remotely", updatedAt: Date.now() + 500 })

    clearSyncLog()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "remote" })

    expect(skippedAsNoOp()).toBe(false)
    expect(ranFullPipeline()).toBe(true)
    expect((await db.decks.get("deck-X"))?.name).toBe("Renamed remotely")
  })

  it("runs the full pipeline when this device has an unpushed local edit", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    // A local-only edit that hasn't been pushed (e.g. the fire-and-forget
    // push never fired), made after lastSyncedAt.
    const local = await db.decks.get("deck-X")
    await db.decks.put({ ...local!, name: "Renamed locally", updatedAt: Date.now() + 500 })

    clearSyncLog()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    expect(skippedAsNoOp()).toBe(false)
    expect(ranFullPipeline()).toBe(true)
    const remoteDeck = getFakeBackend()
      .firestore.docs.get(`users/${FAKE_USER.uid}/decks`)
      ?.get("deck-X") as { name: string } | undefined
    expect(remoteDeck?.name).toBe("Renamed locally")
  })

  it("does not skip a silent remote deletion (doc gone, tombstone not pushed yet)", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    // Simulates another device's deleteDeck(): the remote doc is gone, but
    // its tombstone hasn't reached Firestore yet (debounced up to 30s) — no
    // timestamp anywhere reflects this, only the missing document itself.
    await deleteDeckRemote(fs, FAKE_USER.uid, "deck-X")

    clearSyncLog()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    expect(skippedAsNoOp()).toBe(false)
    expect(ranFullPipeline()).toBe(true)
  })

  it("always runs the full pipeline for a fresh local database, even with a stale lastSyncedAt marker", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    // Local IndexedDB wiped (e.g. storage eviction) without the localStorage
    // lastSyncedAt marker also being cleared.
    await resetDatabase()

    clearSyncLog()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "remote" })

    expect(skippedAsNoOp()).toBe(false)
    expect(ranFullPipeline()).toBe(true)
    expect(await db.decks.get("deck-X")).toBeDefined()
  })

  it("forces a full pipeline once lastSyncedAt is old, even though nothing looks changed", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    // All entity timestamps predate lastSyncedAt (25 min ago vs. 20 min
    // ago), so the plain ">" timestamp/count checks alone would correctly
    // report "nothing changed" here — this isolates the periodic ceiling
    // as the only thing standing between this call and a wrongly-skipped
    // sync, distinct from a scenario the timestamp checks can already see.
    const staleNow = Date.now() - 25 * 60 * 1000
    await applyBulkImport(tinyDeckPayload(staleNow), FAKE_USER)
    // Older than MAX_SHORT_CIRCUIT_INTERVAL_MS (15 minutes) relative to the
    // real current time — bounds how long a gap the cheap checks can't see
    // (e.g. a clock-skewed remote write) could go undetected.
    writeLastSyncedAt(Date.now() - 20 * 60 * 1000)

    clearSyncLog()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    expect(skippedAsNoOp()).toBe(false)
    expect(ranFullPipeline()).toBe(true)
  })

  it("falls back to the full pipeline if the no-op pre-check throws", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    const spy = vi
      .spyOn(db.decks, "count")
      .mockRejectedValueOnce(new Error("boom"))

    clearSyncLog()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    spy.mockRestore()

    expect(skippedAsNoOp()).toBe(false)
    expect(ranFullPipeline()).toBe(true)
  })
})

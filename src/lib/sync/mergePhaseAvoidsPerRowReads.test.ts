/**
 * @vitest-environment node
 *
 * Reproduces "the app is unresponsive for ages right after it loads":
 * `collectEntityConflicts` used to call `db.tombstones.get(...)` once per
 * local row plus once per remote row (and `db.decks/cards/scheduling.get(...)`
 * once per remote row not yet seen locally) — each a separate sequential
 * IndexedDB round trip. For a real collection of a few thousand cards and
 * scheduling rows, that added up to on the order of 15,000 individual
 * awaited reads and ~9.4s of a real sync (measured on a ~1700 card / ~3300
 * scheduling row collection).
 *
 * The fix snapshots tombstones and local ids once per sync and checks them
 * in memory. This asserts the read count no longer scales with row count —
 * it should look like "a handful of bulk reads", not "one read per row".
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
import { resetFakeBackend } from "../../test/fakeFirebase"
import { getFirebaseStorage, getFirestoreDb } from "../firebase"
import { applyBulkImport } from "../../services/bulkImport"
import { runFullSync } from "./runSync"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "merge-perf-uid" } as unknown as import(
  "firebase/auth"
).User

const CARD_COUNT = 300

function manyCardsPayload(): BulkImportPayload {
  const now = Date.now()
  const fsrsCard = emptyFsrs()
  const cards = []
  const scheduling = []
  for (let i = 0; i < CARD_COUNT; i++) {
    cards.push({
      id: `card-${i}`,
      deckId: "deck-X",
      kind: "vocabulary" as const,
      updatedAt: now,
      content: {
        wordJa: `word${i}`,
        reading: "たんご",
        definitionsEn: [`definition ${i}`],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    })
    scheduling.push({
      id: `card-${i}:vocab_oral_en`,
      cardId: `card-${i}`,
      modeId: "vocab_oral_en" as const,
      fsrs: serializeFsrs(fsrsCard),
      due: fsrsCard.due.getTime(),
      updatedAt: now,
    })
  }
  return {
    deck: { id: "deck-X", name: "Big deck", updatedAt: now },
    cards,
    scheduling,
    media: [],
  }
}

describe("merge phase avoids per-row IndexedDB reads", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("doesn't scale db.tombstones.get/db.<table>.get calls with collection size on a steady-state resync", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(manyCardsPayload(), FAKE_USER)
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    const tombstonesGet = vi.spyOn(db.tombstones, "get")
    const decksGet = vi.spyOn(db.decks, "get")
    const cardsGet = vi.spyOn(db.cards, "get")
    const schedulingGet = vi.spyOn(db.scheduling, "get")

    // Nothing changed locally or remotely — mirrors reopening the app.
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    // Without the fix this would be roughly 2x CARD_COUNT calls each (once
    // per local row, once per remote row) — thousands for a real collection.
    const totalGets =
      tombstonesGet.mock.calls.length +
      decksGet.mock.calls.length +
      cardsGet.mock.calls.length +
      schedulingGet.mock.calls.length
    expect(totalGets).toBeLessThan(CARD_COUNT)

    tombstonesGet.mockRestore()
    decksGet.mockRestore()
    cardsGet.mockRestore()
    schedulingGet.mockRestore()
  })
})

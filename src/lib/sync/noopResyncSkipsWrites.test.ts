/**
 * @vitest-environment node
 *
 * Reproduces "reopening the app on the same device still spends ages
 * syncing, even though nothing changed anywhere": `collectEntityConflicts`
 * used to compute a merge "winner" for every local deck/card/scheduling row
 * by comparing timestamps, even when the row's content was byte-for-byte
 * identical to the remote copy. A tie (`remote.updatedAt >= local.updatedAt`)
 * always picked the remote object — which is never `=== local` even though
 * its payload matches — so the `winner === local` no-op guard never caught
 * it, and every unchanged row got rewritten to IndexedDB on every sync.
 *
 * A second, no-op sync (no local or remote changes since the first) should
 * not write any deck/card/scheduling row back to Dexie.
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

const FAKE_USER = { uid: "noop-resync-uid" } as unknown as import(
  "firebase/auth"
).User

function tinyDeckPayload(): BulkImportPayload {
  const now = Date.now()
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

describe("sync: a no-op resync on the same device does not rewrite unchanged rows", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("does not call db.decks/cards/scheduling.put during a second sync with no changes", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    const deckPut = vi.spyOn(db.decks, "put")
    const cardPut = vi.spyOn(db.cards, "put")
    const schedPut = vi.spyOn(db.scheduling, "put")

    // Nothing changed locally or remotely since the first sync — this
    // mirrors reopening the app on the same device.
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    expect(deckPut, "deck rewritten on a no-op sync").not.toHaveBeenCalled()
    expect(cardPut, "card rewritten on a no-op sync").not.toHaveBeenCalled()
    expect(
      schedPut,
      "scheduling row rewritten on a no-op sync",
    ).not.toHaveBeenCalled()

    deckPut.mockRestore()
    cardPut.mockRestore()
    schedPut.mockRestore()
  })
})

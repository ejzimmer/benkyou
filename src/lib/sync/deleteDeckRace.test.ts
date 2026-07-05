/**
 * @vitest-environment node
 *
 * Targeted reproduction of the TOCTOU race in `collectEntityConflicts`:
 * it checks `db.tombstones.get(...)` for an entity, and — only if absent —
 * later calls `db.decks.put(...)` for it. Those two calls are not atomic.
 * If a concurrent `deleteDeck()` records the tombstone and deletes the deck
 * locally in the gap between the check and the put, the put still fires
 * unconditionally and resurrects the deck that was just deleted.
 *
 * This simulates exactly that gap by intercepting the tombstone check for
 * our target deck: it returns the (real, pre-delete) answer, but as a side
 * effect first runs the concurrent delete — mirroring a full sync that
 * raced ahead of an in-flight deleteDeck() on a slower device.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("firebase/firestore", async () => {
  const mod = await import("../../test/fakeFirebase")
  return {
    collection: mod.fakeCollection,
    doc: mod.fakeDoc,
    getDocs: mod.fakeGetDocs,
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
import { deleteDeck } from "../../services/decks"
import { runFullSync, writeLastSyncedAt } from "./runSync"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "race-uid" } as unknown as import("firebase/auth").User

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

describe("race: sync resurrects a deck mid-delete", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("does not resurrect the deck if deleteDeck races between the tombstone check and the put", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    const originalGet = db.tombstones.get.bind(db.tombstones)
    let deleteTriggered = false
    const spy = vi
      .spyOn(db.tombstones, "get")
      // @ts-expect-error -- overload signatures don't unify with a single mock impl
      .mockImplementation(async (key: string) => {
        const result = await originalGet(key)
        if (key === "deck:deck-X" && !deleteTriggered) {
          deleteTriggered = true
          await deleteDeck("deck-X", FAKE_USER)
        }
        return result
      })

    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    spy.mockRestore()

    expect(await db.decks.get("deck-X")).toBeUndefined()
    expect(await db.cards.get("card-X")).toBeUndefined()
  })
})

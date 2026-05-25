/**
 * @vitest-environment node
 *
 * Scenario the user described as "sync completes without errors but doesn't
 * actually download the deck from the other device at all":
 *
 *   1. Device A imports deck D, syncs → Firestore has deck D + cards + sched.
 *   2. User deletes deck D on device A → tombstones for deck/cards/sched
 *      land in Firestore alongside the original entities-now-removed.
 *   3. User re-imports the *same* .apkg on device A. Card / deck IDs are
 *      deterministic (e.g. `anki-deck-1772052380622`), so the new entities
 *      share IDs with the old tombstones. applyBulkImport does NOT clear
 *      the local tombstones, and the next sync push leaves both the new
 *      entities AND the stale tombstones in Firestore.
 *   4. Device B (fresh local Dexie) runs a full sync.
 *
 * Expected: device B ends up with the deck + cards + scheduling locally.
 *
 * Actual on `main` today: device B writes the tombstones into its local
 * Dexie inside `applyRemoteTombstones`, then `collectEntityConflicts` early-
 * returns for every entity whose id has a local tombstone — so the deck and
 * its cards never land on device B even though they exist in Firestore.
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

const FAKE_USER = { uid: "tomb-shadow-uid" } as unknown as import(
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

describe("sync: stale tombstones must not shadow a re-imported deck", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("device B pulls the deck + cards even when Firestore still has tombstones from a previous delete on device A", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    // --- Device A: import, sync, delete, re-import, sync ---
    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())

    // Pretend a small amount of time elapsed before deletion / re-import.
    await new Promise((r) => setTimeout(r, 5))
    await deleteDeck("deck-X", FAKE_USER)

    await new Promise((r) => setTimeout(r, 5))
    await applyBulkImport(tinyDeckPayload(), FAKE_USER)

    // Mirror what the live app does after import: a full sync push of
    // local state to Firestore (this is what would happen on the next
    // sign-in / visibility flip / manual "Sync now").
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    // --- Device B: fresh local DB, full sync ---
    await resetDatabase()
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "remote",
    })

    expect(await db.decks.get("deck-X"), "deck on device B").toBeDefined()
    expect(await db.cards.get("card-X"), "card on device B").toBeDefined()
    expect(
      await db.scheduling.get("card-X:vocab_oral_en"),
      "scheduling on device B",
    ).toBeDefined()
  })
})

/**
 * @vitest-environment node
 *
 * Reproduction of "deck disappears, then reappears on another device":
 * `deleteDeck()` deletes the remote deck/card/scheduling *documents*
 * directly, but the corresponding tombstones only reach Firestore later, via
 * the debounced full-push path. If a second device — which already has the
 * deck locally from an earlier sync — runs a full sync in that gap, it sees
 * the deck vanish from the remote snapshot with no tombstone to explain why.
 *
 * Before the fix, `collectEntityConflicts` just `continue`d in that case,
 * leaving the stale local copy untouched — and the same sync's
 * `pushLocalToRemote` then unconditionally re-uploaded that stale local deck,
 * resurrecting it in Firestore for every device.
 *
 * The fix: a local entity with no tombstone that's missing from the remote
 * snapshot, and which this device already knew about as of its last
 * successful sync (`local.updatedAt <= lastSyncedAt`), is now deleted
 * locally (with a fresh tombstone) instead of being left alone.
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
import { resetFakeBackend, getFakeBackend } from "../../test/fakeFirebase"
import { getFirebaseStorage, getFirestoreDb } from "../firebase"
import { applyBulkImport } from "../../services/bulkImport"
import {
  deleteDeckRemote,
  deleteCardRemote,
  deleteSchedulingRemote,
} from "./firestoreSync"
import { runFullSync, writeLastSyncedAt } from "./runSync"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "vanish-uid" } as unknown as import("firebase/auth").User

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

describe("sync: a deck deleted-but-not-yet-tombstoned on another device must not be resurrected", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("device B deletes its stale local copy instead of re-uploading it", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    // --- Device A: import + sync → Firestore has deck-X + card-X + scheduling.
    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    // --- Device B: fresh local DB, syncs and pulls the deck down.
    await resetDatabase()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "remote" })
    expect(await db.decks.get("deck-X"), "deck pulled to device B").toBeDefined()

    await new Promise((r) => setTimeout(r, 5))

    // --- Some other device deletes the deck: its direct remote deletes have
    // landed, but its tombstone push (debounced) has not reached Firestore
    // yet — so there is no remote tombstone for deck-X/card-X/scheduling.
    await deleteDeckRemote(fs, FAKE_USER.uid, "deck-X")
    await deleteCardRemote(fs, FAKE_USER.uid, "card-X")
    await deleteSchedulingRemote(fs, FAKE_USER.uid, "card-X:vocab_oral_en")

    // --- Device B syncs again, still holding its local copy of deck-X.
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    expect(await db.decks.get("deck-X"), "deck on device B").toBeUndefined()
    expect(await db.cards.get("card-X"), "card on device B").toBeUndefined()
    expect(
      await db.scheduling.get("card-X:vocab_oral_en"),
      "scheduling on device B",
    ).toBeUndefined()

    // Critically: device B must not have re-uploaded its stale copy back to
    // Firestore during this same sync's pushLocalToRemote step.
    const remoteDecks = getFakeBackend().firestore.docs.get(
      `users/${FAKE_USER.uid}/decks`,
    )
    expect(remoteDecks?.has("deck-X"), "deck resurrected in Firestore").toBe(
      false,
    )
  })
})

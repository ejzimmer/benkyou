/**
 * @vitest-environment node
 *
 * A vocabulary card with a blank Japanese word can't have come from a
 * completed save (`validateVocabulary` blocks that at the form) — reaching
 * one in a sync conflict means a stale/partial write, not a real edit worth
 * asking the user to arbitrate. `resolveConflictChoice` should auto-resolve
 * straight to whichever side has a non-blank word, without ever calling
 * `onConflict`.
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
import { runFullSync, writeLastSyncedAt } from "./runSync"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "empty-word-uid" } as unknown as import("firebase/auth").User
const CARD_ID = "card-empty-word"

function vocabContent(wordJa: string) {
  return { wordJa, definitionsEn: ["cat"], images: [], exampleSentences: [] }
}

function tinyDeckPayload(wordJa: string): BulkImportPayload {
  const now = Date.now()
  return {
    deck: { id: "deck-empty", name: "Test deck", updatedAt: now },
    cards: [
      {
        id: CARD_ID,
        deckId: "deck-empty",
        kind: "vocabulary",
        updatedAt: now,
        content: vocabContent(wordJa),
      },
    ],
    scheduling: [],
    media: [],
  }
}

/** Edits the remote card doc directly, mirroring another device's write. */
function editRemoteCard(uid: string, id: string, patch: object): void {
  const coll = getFakeBackend().firestore.docs.get(`users/${uid}/cards`)
  const current = coll?.get(id)
  coll?.set(id, { ...(current as object), ...patch })
}

describe("sync: an empty-word vocabulary card never prompts for a conflict", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("keeps the remote card without calling onConflict when the local word is blank", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload("猫"), FAKE_USER)
    writeLastSyncedAt(Date.now())

    // Both sides change since last sync, so this is a genuine two-way
    // conflict — local's word goes blank (the case under test), remote's
    // stays valid.
    await db.cards.update(CARD_ID, {
      content: vocabContent(""),
      updatedAt: Date.now() + 500,
    })
    editRemoteCard(FAKE_USER.uid, CARD_ID, {
      content: vocabContent("猫"),
      updatedAt: Date.now() + 1000,
    })

    const onConflict = vi.fn()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict })

    expect(onConflict).not.toHaveBeenCalled()
    const card = await db.cards.get(CARD_ID)
    expect(card?.content).toMatchObject({ wordJa: "猫" })
  })

  it("keeps the local card without calling onConflict when the remote word is blank", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload("猫"), FAKE_USER)
    writeLastSyncedAt(Date.now())

    await db.cards.update(CARD_ID, {
      content: vocabContent("猫"),
      updatedAt: Date.now() + 500,
    })
    editRemoteCard(FAKE_USER.uid, CARD_ID, {
      content: vocabContent(""),
      updatedAt: Date.now() + 1000,
    })

    const onConflict = vi.fn()
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict })

    expect(onConflict).not.toHaveBeenCalled()
    const card = await db.cards.get(CARD_ID)
    expect(card?.content).toMatchObject({ wordJa: "猫" })
  })

  it("still prompts when both sides are non-blank and genuinely differ", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload("猫"), FAKE_USER)
    writeLastSyncedAt(Date.now())

    await db.cards.update(CARD_ID, {
      content: vocabContent("犬"),
      updatedAt: Date.now() + 500,
    })
    editRemoteCard(FAKE_USER.uid, CARD_ID, {
      content: vocabContent("猫"),
      updatedAt: Date.now() + 1000,
    })

    const onConflict = vi.fn().mockResolvedValue("remote")
    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict })

    expect(onConflict).toHaveBeenCalledTimes(1)
  })
})

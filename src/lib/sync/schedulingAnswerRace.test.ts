/**
 * @vitest-environment node
 *
 * Reproduces the "card reappears in the same review session" bug:
 * `collectEntityConflicts` snapshots `db.scheduling.toArray()` once up
 * front, then loops over that stale snapshot deciding a merge winner and
 * writing it back. If the user answers a card (bumping its scheduling row's
 * `due`/`updatedAt`) after the snapshot was taken but before the loop
 * reaches that row, the sync write used to silently overwrite the fresh
 * answer with the stale pre-answer data — making the card look due again
 * and reappear in the same session's queue.
 *
 * This simulates that gap by intercepting the tombstone check for the
 * target scheduling row: it returns the real answer, but as a side effect
 * first performs the concurrent "answer" write — mirroring a review answer
 * landing while `collectEntityConflicts` is still working through its
 * in-memory snapshot.
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
import { runFullSync, writeLastSyncedAt } from "./runSync"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "race-uid" } as unknown as import("firebase/auth").User
const SCHED_ID = "card-X:vocab_oral_en"

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
        id: SCHED_ID,
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

describe("race: sync reverts a scheduling row answered mid-sync", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("does not revert a scheduling row answered while sync is still processing its stale snapshot", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(tinyDeckPayload(), FAKE_USER)
    writeLastSyncedAt(Date.now())

    const farFuture = Date.now() + 1000 * 60 * 60 * 24 * 30
    const answeredRow = {
      id: SCHED_ID,
      cardId: "card-X",
      modeId: "vocab_oral_en" as const,
      fsrs: serializeFsrs(emptyFsrs()),
      due: farFuture,
      updatedAt: Date.now() + 1000,
    }

    const originalGet = db.tombstones.get.bind(db.tombstones)
    let answered = false
    const spy = vi
      .spyOn(db.tombstones, "get")
      // @ts-expect-error -- overload signatures don't unify with a single mock impl
      .mockImplementation(async (key: string) => {
        const result = await originalGet(key)
        if (key === `scheduling:${SCHED_ID}` && !answered) {
          answered = true
          await db.scheduling.put(answeredRow)
        }
        return result
      })

    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    spy.mockRestore()

    const row = await db.scheduling.get(SCHED_ID)
    expect(row?.due).toBe(farFuture)
    expect(row?.updatedAt).toBe(answeredRow.updatedAt)
  })

  it("still detects the race when the answer lands in the same millisecond as the snapshot", async () => {
    // Two `Date.now()` calls (the sync snapshot and a racing answer) can
    // resolve to the identical millisecond, so the staleness check must not
    // rely on `updatedAt` alone — it needs to notice the content differs.
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    const payload = tinyDeckPayload()
    const snapshotUpdatedAt = payload.scheduling[0].updatedAt
    await applyBulkImport(payload, FAKE_USER)
    writeLastSyncedAt(Date.now())

    const farFuture = Date.now() + 1000 * 60 * 60 * 24 * 30
    const answeredRow = {
      id: SCHED_ID,
      cardId: "card-X",
      modeId: "vocab_oral_en" as const,
      fsrs: serializeFsrs(emptyFsrs()),
      due: farFuture,
      updatedAt: snapshotUpdatedAt,
    }

    const originalGet = db.tombstones.get.bind(db.tombstones)
    let answered = false
    const spy = vi
      .spyOn(db.tombstones, "get")
      // @ts-expect-error -- overload signatures don't unify with a single mock impl
      .mockImplementation(async (key: string) => {
        const result = await originalGet(key)
        if (key === `scheduling:${SCHED_ID}` && !answered) {
          answered = true
          await db.scheduling.put(answeredRow)
        }
        return result
      })

    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    spy.mockRestore()

    const row = await db.scheduling.get(SCHED_ID)
    expect(row?.due).toBe(farFuture)
  })
})

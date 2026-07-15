/**
 * @vitest-environment node
 *
 * Reproduces the "card reappears in the same review session" bug:
 * `collectEntityConflicts` decides a merge winner from a stale in-memory
 * snapshot, then writes it back via `putIfNotStale`, which re-checks the
 * *current* row immediately before writing and refuses to write if it has
 * changed since the snapshot. If the user answers a card (bumping its
 * scheduling row's `due`/`updatedAt`) after the snapshot was taken but
 * before `putIfNotStale`'s write actually lands, that re-check is the only
 * thing standing between the sync and silently overwriting the fresh answer
 * with stale data — making the card look due again and reappear in the same
 * session's queue.
 *
 * To actually exercise `putIfNotStale` (not just the cheap early-exit for
 * "nothing changed"), the test first simulates another device pushing a
 * different scheduling state to the remote backend, so this device's sync
 * has real merge work to do for the row. It then intercepts
 * `db.scheduling.get` — the exact call `putIfNotStale` makes to read the
 * live row right before writing — and performs the concurrent "answer"
 * write as a side effect of that read, mirroring a review answer landing in
 * the narrow window between the snapshot and the write.
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

/**
 * Simulates another device already having pushed a different scheduling
 * state to the remote backend, so this device's sync has genuine merge work
 * to do for the row (forcing the code past the "content already matches,
 * nothing to do" early exit and into `putIfNotStale`).
 */
function editRemoteSchedulingRow(uid: string, id: string, patch: object): void {
  const coll = getFakeBackend().firestore.docs.get(`users/${uid}/scheduling`)
  const current = coll?.get(id)
  coll?.set(id, { ...(current as object), ...patch })
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

    // Another device's edit, already on remote and newer than lastSyncedAt —
    // guarantees resolveEntityMerge picks "remote" (a different object than
    // the local snapshot), so collectEntityConflicts actually attempts a
    // write via putIfNotStale instead of skipping early.
    editRemoteSchedulingRow(FAKE_USER.uid, SCHED_ID, {
      due: Date.now() + 1000 * 60 * 60,
      updatedAt: Date.now() + 500,
    })

    const farFuture = Date.now() + 1000 * 60 * 60 * 24 * 30
    const answeredRow = {
      id: SCHED_ID,
      cardId: "card-X",
      modeId: "vocab_oral_en" as const,
      fsrs: serializeFsrs(emptyFsrs()),
      due: farFuture,
      updatedAt: Date.now() + 1000,
    }

    // putIfNotStale calls db.scheduling.get(local.id) to read the live row
    // immediately before writing — intercepting it simulates the review
    // answer landing in exactly that window.
    const originalGet = db.scheduling.get.bind(db.scheduling)
    let answered = false
    const spy = vi
      .spyOn(db.scheduling, "get")
      // @ts-expect-error -- overload signatures don't unify with a single mock impl
      .mockImplementation(async (key: string) => {
        if (key === SCHED_ID && !answered) {
          answered = true
          await db.scheduling.put(answeredRow)
        }
        return originalGet(key)
      })

    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    // Sanity check this test actually exercised putIfNotStale's live
    // re-check, not some other path that happens to leave the row alone.
    // (mockRestore() below clears call history, so this must run first.)
    expect(spy).toHaveBeenCalledWith(SCHED_ID)

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

    editRemoteSchedulingRow(FAKE_USER.uid, SCHED_ID, {
      due: Date.now() + 1000 * 60 * 60,
      updatedAt: Date.now() + 500,
    })

    const farFuture = Date.now() + 1000 * 60 * 60 * 24 * 30
    const answeredRow = {
      id: SCHED_ID,
      cardId: "card-X",
      modeId: "vocab_oral_en" as const,
      fsrs: serializeFsrs(emptyFsrs()),
      due: farFuture,
      updatedAt: snapshotUpdatedAt,
    }

    const originalGet = db.scheduling.get.bind(db.scheduling)
    let answered = false
    const spy = vi
      .spyOn(db.scheduling, "get")
      // @ts-expect-error -- overload signatures don't unify with a single mock impl
      .mockImplementation(async (key: string) => {
        if (key === SCHED_ID && !answered) {
          answered = true
          await db.scheduling.put(answeredRow)
        }
        return originalGet(key)
      })

    await runFullSync({ fs, storage, uid: FAKE_USER.uid, onConflict: async () => "local" })

    expect(spy).toHaveBeenCalledWith(SCHED_ID)

    spy.mockRestore()

    const row = await db.scheduling.get(SCHED_ID)
    expect(row?.due).toBe(farFuture)
  })
})

/**
 * @vitest-environment node
 *
 * The user reported that starting a review "takes a really long time...
 * even though nothing has changed". Root cause: `hydrateReferencedMedia`
 * (run at the end of every sync, gating review start) checked each
 * referenced image with `await db.media.get(id)` one at a time — hundreds
 * of sequential IndexedDB round trips even when every image was already
 * local. This asserts the fix: it now loads local media in one bulk query,
 * so per-id `db.media.get` is never called just to discover something is
 * already there.
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
import { hydrateReferencedMedia } from "./mediaSync"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "hydrate-bulk-uid" } as unknown as import(
  "firebase/auth"
).User

function deckWithImages(count: number): BulkImportPayload {
  const now = Date.now()
  const fsrsCard = emptyFsrs()
  const ids = Array.from({ length: count }, (_, i) => `media-${i}`)
  return {
    deck: { id: "deck-H", name: "Hydrate deck", updatedAt: now },
    cards: ids.map((mediaId, i) => ({
      id: `card-${i}`,
      deckId: "deck-H",
      kind: "vocabulary" as const,
      updatedAt: now,
      content: {
        wordJa: `word${i}`,
        reading: "よみ",
        definitionsEn: ["def"],
        images: [mediaId],
        exampleSentences: [],
      },
    })),
    scheduling: ids.map((_, i) => ({
      id: `card-${i}:vocab_oral_en`,
      cardId: `card-${i}`,
      modeId: "vocab_oral_en" as const,
      fsrs: serializeFsrs(fsrsCard),
      due: fsrsCard.due.getTime(),
      updatedAt: now,
    })),
    media: ids.map((mediaId, i) => ({
      id: mediaId,
      mimeType: "image/png",
      bytes: new Uint8Array([i, i + 1, i + 2]),
    })),
  }
}

describe("hydrateReferencedMedia bulk-loads local media", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("does not call db.media.get per id when everything is already local", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!

    await applyBulkImport(deckWithImages(20), FAKE_USER)
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    const getSpy = vi.spyOn(db.media, "get")

    const result = await hydrateReferencedMedia(FAKE_USER.uid)

    expect(result).toEqual({
      total: 20,
      pulled: 0,
      alreadyLocal: 20,
      failed: 0,
    })
    // The whole point: no per-id round trips once everything is local.
    expect(getSpy).not.toHaveBeenCalled()

    getSpy.mockRestore()
  })
})

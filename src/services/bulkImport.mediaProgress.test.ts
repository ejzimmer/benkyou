/**
 * @vitest-environment node
 *
 * The "uploading images" phase used to report no progress at all — just a
 * static label — even though it uploads one media blob at a time and knows
 * the total up front. This asserts pushLocalMediaToRemote's progress
 * callback (threaded through applyBulkImport) actually counts up.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("firebase/firestore", async () => {
  const mod = await import("../test/fakeFirebase")
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
  const mod = await import("../test/fakeFirebase")
  return {
    ref: mod.fakeRef,
    uploadBytes: mod.fakeUploadBytes,
    getBlob: mod.fakeGetBlob,
    getBytes: mod.fakeGetBytes,
    deleteObject: mod.fakeDeleteObject,
  }
})

vi.mock("../lib/firebase", () => {
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

import { resetDatabase } from "../test/db"
import { resetFakeBackend } from "../test/fakeFirebase"
import { applyBulkImport, type ImportProgress } from "./bulkImport"
import { emptyFsrs, serializeFsrs } from "../lib/srs/schedule"
import type { BulkImportPayload } from "../lib/import/types"

const FAKE_USER = { uid: "media-progress-uid" } as unknown as import(
  "firebase/auth"
).User

function deckWithMediaPayload(mediaCount: number): BulkImportPayload {
  const now = Date.now()
  const fsrsCard = emptyFsrs()
  const mediaIds = Array.from({ length: mediaCount }, (_, i) => `media-${i}`)
  return {
    deck: { id: "deck-M", name: "Media deck", updatedAt: now },
    cards: [
      {
        id: "card-M",
        deckId: "deck-M",
        kind: "vocabulary",
        updatedAt: now,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          definitionsEn: ["cat"],
          images: mediaIds,
          exampleSentences: [],
          synonymsJa: [],
        },
      },
    ],
    scheduling: [
      {
        id: "card-M:vocab_oral_en",
        cardId: "card-M",
        modeId: "vocab_oral_en",
        fsrs: serializeFsrs(fsrsCard),
        due: fsrsCard.due.getTime(),
        updatedAt: now,
      },
    ],
    media: mediaIds.map((id, i) => ({
      id,
      mimeType: "image/png",
      bytes: new Uint8Array([i, i + 1, i + 2]),
    })),
  }
}

describe("applyBulkImport uploading-media progress", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("counts up per media item instead of reporting nothing", async () => {
    const events: ImportProgress[] = []
    await applyBulkImport(deckWithMediaPayload(3), FAKE_USER, (p) =>
      events.push(p),
    )

    const mediaEvents = events.filter((e) => e.phase === "uploading-media")
    expect(mediaEvents.length).toBeGreaterThan(1)
    expect(mediaEvents[0]).toEqual({
      phase: "uploading-media",
      current: 0,
      total: 3,
    })
    expect(mediaEvents[mediaEvents.length - 1]).toEqual({
      phase: "uploading-media",
      current: 3,
      total: 3,
    })
    for (let i = 1; i < mediaEvents.length; i++) {
      const prev = mediaEvents[i - 1]
      const cur = mediaEvents[i]
      if (prev.phase === "uploading-media" && cur.phase === "uploading-media") {
        expect(cur.current).toBeGreaterThan(prev.current)
      }
    }
  })
})

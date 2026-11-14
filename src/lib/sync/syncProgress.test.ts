/**
 * @vitest-environment node
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

import { resetDatabase } from "../../test/db"
import { resetFakeBackend } from "../../test/fakeFirebase"
import { getFirebaseStorage, getFirestoreDb } from "../firebase"
import { applyBulkImport } from "../../services/bulkImport"
import { runFullSync, runPushOnly, writeLastSyncedAt } from "./runSync"
import type { SyncProgress, SyncStage } from "./syncTypes"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = {
  uid: "progress-uid",
} as unknown as import("firebase/auth").User

function pictureCardPayload(now = Date.now()): BulkImportPayload {
  const fsrsCard = emptyFsrs()
  return {
    deck: { id: "deck-P", name: "Test deck", updatedAt: now },
    cards: [
      {
        id: "card-P",
        deckId: "deck-P",
        kind: "vocabulary",
        updatedAt: now,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          definitionsEn: ["cat"],
          images: ["img-P"],
          exampleSentences: [],
        },
      },
    ],
    scheduling: [
      {
        id: "card-P:vocab_oral_en",
        cardId: "card-P",
        modeId: "vocab_oral_en",
        fsrs: serializeFsrs(fsrsCard),
        due: fsrsCard.due.getTime(),
        updatedAt: now,
      },
    ],
    media: [
      { id: "img-P", mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]) },
    ],
  }
}

function stagesInOrder(reports: SyncProgress[]): SyncStage[] {
  return reports
    .map((report) => report.stage)
    .filter((stage, i, stages) => stage !== stages[i - 1])
}

function lastFractionFor(reports: SyncProgress[], stage: SyncStage) {
  return reports.filter((report) => report.stage === stage).at(-1)?.fraction
}

describe("sync progress reporting", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
    await applyBulkImport(pictureCardPayload(), FAKE_USER)
  })

  describe("a full sync", () => {
    describe("when the full pipeline runs", () => {
      it("moves through cards, then images, then upload", async () => {
        const reports: SyncProgress[] = []
        await runFullSync({
          fs: getFirestoreDb()!,
          storage: getFirebaseStorage()!,
          uid: FAKE_USER.uid,
          onConflict: async () => "local",
          onProgress: (report) => reports.push(report),
        })

        expect(stagesInOrder(reports)).toEqual(["cards", "images", "upload"])
      })

      it("finishes every stage", async () => {
        const reports: SyncProgress[] = []
        await runFullSync({
          fs: getFirestoreDb()!,
          storage: getFirebaseStorage()!,
          uid: FAKE_USER.uid,
          onConflict: async () => "local",
          onProgress: (report) => reports.push(report),
        })

        expect(lastFractionFor(reports, "cards")).toBe(1)
        expect(lastFractionFor(reports, "images")).toBe(1)
        expect(lastFractionFor(reports, "upload")).toBe(1)
      })

      it("only ever moves forward within a stage", async () => {
        const reports: SyncProgress[] = []
        await runFullSync({
          fs: getFirestoreDb()!,
          storage: getFirebaseStorage()!,
          uid: FAKE_USER.uid,
          onConflict: async () => "local",
          onProgress: (report) => reports.push(report),
        })

        for (const stage of ["cards", "images", "upload"] as const) {
          const fractions = reports
            .filter((report) => report.stage === stage)
            .map((report) => report.fraction ?? 0)
          expect(fractions).toEqual([...fractions].sort((a, b) => a - b))
        }
      })
    })

    describe("when nothing changed since the last sync", () => {
      it("only reports checking the cards", async () => {
        const options = {
          fs: getFirestoreDb()!,
          storage: getFirebaseStorage()!,
          uid: FAKE_USER.uid,
          onConflict: async () => "local" as const,
        }
        writeLastSyncedAt(Date.now())
        await runFullSync(options)

        const reports: SyncProgress[] = []
        await runFullSync({
          ...options,
          onProgress: (report) => reports.push(report),
        })

        expect(reports).toEqual([{ stage: "cards", fraction: null }])
      })
    })
  })

  describe("an upload-only push", () => {
    it("moves through images, then upload", async () => {
      const reports: SyncProgress[] = []
      await runPushOnly(
        getFirestoreDb()!,
        getFirebaseStorage()!,
        FAKE_USER.uid,
        (report) => reports.push(report),
      )

      expect(stagesInOrder(reports)).toEqual(["images", "upload"])
      expect(lastFractionFor(reports, "upload")).toBe(1)
    })
  })
})

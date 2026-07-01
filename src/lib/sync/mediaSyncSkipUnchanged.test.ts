/**
 * @vitest-environment node
 *
 * The user reported that sync "takes a long time" and seems to re-download
 * images even when nothing changed. Root cause: `syncOneMediaItem` used to
 * unconditionally download the remote blob and re-upload the local one on
 * every sync, purely to hash-compare content. This asserts the fix: once
 * both sides agree on a content digest, an unchanged media item moves zero
 * bytes on a later sync — and a pre-existing remote entry with no cached
 * digest gets backfilled (downloaded once, hashed, and the hash written
 * back) rather than being downloaded on every sync forever.
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
import { getFakeBackend, resetFakeBackend } from "../../test/fakeFirebase"
import { getFirebaseStorage, getFirestoreDb } from "../firebase"
import { applyBulkImport } from "../../services/bulkImport"
import { runFullSync } from "./runSync"
import { emptyFsrs, serializeFsrs } from "../srs/schedule"
import type { BulkImportPayload } from "../import/types"

const FAKE_USER = { uid: "media-skip-uid" } as unknown as import(
  "firebase/auth"
).User

function deckWithImagePayload(): BulkImportPayload {
  const now = Date.now()
  const fsrsCard = emptyFsrs()
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
          images: ["media-M"],
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
    media: [
      {
        id: "media-M",
        mimeType: "image/png",
        bytes: new Uint8Array([1, 2, 3, 4, 5]),
      },
    ],
  }
}

describe("media sync skips unchanged content", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it("moves zero bytes for an image on a second sync once digests match", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!
    const backend = getFakeBackend()

    await applyBulkImport(deckWithImagePayload(), FAKE_USER)

    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    // The remote metadata doc now carries a content digest.
    const metaColl = backend.firestore.docs.get(
      `users/${FAKE_USER.uid}/media`,
    )
    const meta = metaColl?.get("media-M") as { digest?: string } | undefined
    expect(meta?.digest).toBeTruthy()

    backend.storage.uploads.length = 0
    backend.storage.downloads.length = 0

    // Nothing changed locally or remotely — sync again.
    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    expect(backend.storage.downloads).toEqual([])
    expect(backend.storage.uploads).toEqual([])
  })

  it("backfills a digest for remote media metadata written before hash tracking, then skips it next time", async () => {
    const fs = getFirestoreDb()!
    const storage = getFirebaseStorage()!
    const backend = getFakeBackend()

    await applyBulkImport(deckWithImagePayload(), FAKE_USER)

    // Simulate a pre-existing remote metadata doc with no digest field, as
    // if it were written before this feature shipped.
    const metaColl = backend.firestore.docs.get(
      `users/${FAKE_USER.uid}/media`,
    )
    expect(metaColl).toBeDefined()
    const existing = metaColl!.get("media-M") as Record<string, unknown>
    metaColl!.set("media-M", {
      id: existing.id,
      mimeType: existing.mimeType,
      updatedAt: existing.updatedAt,
    })
    // Force the local row to look unhashed too, and pretend this is a
    // second device that only knows about the metadata, not the blob.
    await db.media.update("media-M", { digest: undefined })

    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    expect(backend.storage.downloads.length).toBeGreaterThan(0)
    const backfilled = metaColl!.get("media-M") as { digest?: string }
    expect(backfilled.digest).toBeTruthy()

    backend.storage.uploads.length = 0
    backend.storage.downloads.length = 0

    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "local",
    })

    expect(backend.storage.downloads).toEqual([])
    expect(backend.storage.uploads).toEqual([])
  })
})

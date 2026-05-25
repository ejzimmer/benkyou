/**
 * @vitest-environment node
 *
 * Diagnostic test suite for the reported import & sync issues:
 *
 *   1. Importing a deck on device A uploads media to Storage *and* writes the
 *      `users/{uid}/media/{id}` metadata to Firestore (so device B's sync can
 *      discover the media). Today only the Storage upload happens.
 *
 *   2. Every Storage upload carries the correct image content-type — e.g.
 *      `image/jpeg`, never `application/octet-stream`. Without this, Firebase
 *      Storage cannot preview the image and Safari refuses to render the
 *      object URL when the media is downloaded again on another device.
 *
 *   3. Running a full sync on a fresh device B pulls the deck, the cards AND
 *      the referenced media — and stores the media in IndexedDB with the
 *      correct mime type so `<img src=blob:>` actually renders.
 *
 *   4. Sync runs are triggered intentionally, not "randomly" on every tab
 *      visibility flip. The visibility-driven sync trigger must throttle
 *      itself so that repeated visibility flips inside a short window do not
 *      kick off additional sync runs.
 *
 * All four `it()` blocks are expected to FAIL on the current `main` and to
 * pass once the bugs are fixed.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

// --- imports that depend on the mocks --------------------------------------

import { applyBulkImport } from "../../services/bulkImport"
import { convertExtractedPackage } from "../import/convert"
import type { ExtractedPackage } from "../import/types"
import { db } from "../db/schema"
import { resetDatabase } from "../../test/db"
import { getFirebaseStorage, getFirestoreDb } from "../firebase"
import { runFullSync } from "./runSync"
import { getFakeBackend, resetFakeBackend } from "../../test/fakeFirebase"

// --- helpers ---------------------------------------------------------------

const FAKE_USER = { uid: "test-uid" } as unknown as import("firebase/auth").User

function loadFixturePayload() {
  const fixturePath = resolve(
    __dirname,
    "../../test/fixtures/anki-tonagari-mini.json",
  )
  const pkg = JSON.parse(readFileSync(fixturePath, "utf8")) as ExtractedPackage
  return convertExtractedPackage(pkg, (relativePath) => {
    const abs = resolve(__dirname, "../../test/fixtures", relativePath)
    return new Uint8Array(readFileSync(abs))
  })
}

function listFirestoreCollection(uid: string, name: string) {
  const path = `users/${uid}/${name}`
  const m = getFakeBackend().firestore.docs.get(path)
  return m ? [...m.entries()] : []
}

function listStorageBlobs(uid: string) {
  const prefix = `users/${uid}/media/`
  const out: Array<{ path: string; contentType: string; size: number }> = []
  for (const [path, entry] of getFakeBackend().storage.blobs.entries()) {
    if (path.startsWith(prefix)) {
      out.push({
        path,
        contentType: entry.contentType,
        size: entry.bytes.byteLength,
      })
    }
  }
  return out
}

beforeEach(async () => {
  resetFakeBackend()
  await resetDatabase()
})

afterEach(async () => {
  await resetDatabase()
})

// --- the bugs --------------------------------------------------------------

describe("import & sync flow — reported bugs", () => {
  it("bug #1: applyBulkImport writes media metadata to Firestore so other devices can discover blobs", async () => {
    const payload = loadFixturePayload()
    expect(payload.media.length).toBeGreaterThan(0)

    await applyBulkImport(payload, FAKE_USER)

    const remoteMediaDocs = listFirestoreCollection(FAKE_USER.uid, "media")
    expect(remoteMediaDocs.length).toBe(payload.media.length)
    const remoteIds = new Set(remoteMediaDocs.map(([id]) => id))
    for (const item of payload.media) {
      expect(remoteIds.has(item.id)).toBe(true)
    }
    for (const [id, data] of remoteMediaDocs) {
      const expected = payload.media.find((m) => m.id === id)
      expect(expected, `payload media ${id}`).toBeDefined()
      expect((data as { mimeType?: string }).mimeType).toBe(expected!.mimeType)
    }
  })

  it("bug #2: media uploaded to Storage uses an image content-type (never application/octet-stream)", async () => {
    const payload = loadFixturePayload()
    await applyBulkImport(payload, FAKE_USER)

    const uploads = listStorageBlobs(FAKE_USER.uid)
    expect(uploads.length).toBe(payload.media.length)

    for (const u of uploads) {
      expect(u.contentType, `upload ${u.path}`).toBe("image/jpeg")
      expect(u.contentType).not.toBe("application/octet-stream")
      expect(u.contentType).not.toBe("")
      expect(u.size).toBeGreaterThan(0)
    }
  })

  it("bug #3: a fresh device B's runFullSync downloads referenced media into IndexedDB with the correct mime type", async () => {
    const payload = loadFixturePayload()
    await applyBulkImport(payload, FAKE_USER)

    const cardsWithImages = payload.cards.filter(
      (c) => c.content.images.length > 0,
    )
    expect(cardsWithImages.length).toBeGreaterThan(0)
    const expectedMediaIds = new Set<string>()
    for (const c of cardsWithImages) {
      for (const id of c.content.images) expectedMediaIds.add(id)
    }
    expect(expectedMediaIds.size).toBeGreaterThan(0)

    await resetDatabase()
    expect(await db.media.count()).toBe(0)
    expect(await db.cards.count()).toBe(0)

    const fs = getFirestoreDb()
    const storage = getFirebaseStorage()
    if (!fs || !storage) throw new Error("Firebase mocks not wired up")

    await runFullSync({
      fs,
      storage,
      uid: FAKE_USER.uid,
      onConflict: async () => "remote",
    })

    expect(await db.decks.count()).toBe(1)
    expect(await db.cards.count()).toBe(payload.cards.length)

    for (const id of expectedMediaIds) {
      const row = await db.media.get(id)
      expect(row, `media ${id}`).toBeDefined()
      expect(row!.blob.size, `media ${id} size`).toBeGreaterThan(0)
      expect(row!.mimeType, `media ${id} mime`).toMatch(/^image\//)
      expect(row!.blob.type, `media ${id} blob type`).toMatch(/^image\//)
    }
  })

  it("bug #4: visibility-driven sync triggers are throttled (no runaway re-syncs on screen flips)", async () => {
    const { createVisibilitySyncTrigger } = await import("./syncTrigger")
    vi.useFakeTimers()
    try {
      const syncNow = vi.fn(async () => {})
      const trigger = createVisibilitySyncTrigger({
        syncNow,
        now: () => Date.now(),
        minIntervalMs: 60_000,
      })

      await trigger.onVisible()
      expect(syncNow).toHaveBeenCalledTimes(1)

      await trigger.onVisible()
      vi.advanceTimersByTime(5_000)
      await trigger.onVisible()
      vi.advanceTimersByTime(20_000)
      await trigger.onVisible()
      expect(syncNow).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60_000)
      await trigger.onVisible()
      expect(syncNow).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

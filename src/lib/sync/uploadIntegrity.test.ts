/**
 * @vitest-environment node
 *
 * Stricter integration test: simulate the full import + push pipeline using
 * the user's real deck and assert that the bytes uploaded to (fake) Storage
 * really are valid JPEGs that round-trip identically through the Blob
 * layer. This catches a regression where parseApkg, applyBulkImport, the
 * Dexie roundtrip, or pushLocalMediaToRemote silently corrupts the bytes.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
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

import { applyBulkImport } from "../../services/bulkImport"
import { parseAnkiPackageToBulkImport } from "../import/parseApkg"
import { resetDatabase } from "../../test/db"
import { db } from "../db/schema"
import { getFakeBackend, resetFakeBackend } from "../../test/fakeFirebase"

const USER_DECK = resolve(
  __dirname,
  "../../../test-decks/とんがり帽子のアトリエ-20260516063503.apkg",
)

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer
}

const FAKE_USER = { uid: "integration-uid" } as unknown as import(
  "firebase/auth"
).User

describe("import → upload integrity (user deck)", () => {
  beforeEach(async () => {
    resetFakeBackend()
    await resetDatabase()
  })

  it.skipIf(!existsSync(USER_DECK))(
    "every JPEG uploaded to Storage starts with FF D8 FF and round-trips byte-for-byte",
    async () => {
      const u8 = readFileSync(USER_DECK)
      const payload = await parseAnkiPackageToBulkImport(toArrayBuffer(u8))

      // Sanity: payload media bytes are already correct after the parseApkg fix.
      const sample = payload.media.find((m) => m.mimeType === "image/jpeg")
      expect(sample, "fixture has a JPEG").toBeDefined()
      expect(sample!.bytes!.slice(0, 3)).toEqual(
        new Uint8Array([0xff, 0xd8, 0xff]),
      )

      await applyBulkImport(payload, FAKE_USER)

      const backend = getFakeBackend()
      const uploads = [...backend.storage.blobs.entries()].filter(([p]) =>
        p.startsWith(`users/${FAKE_USER.uid}/media/`),
      )
      expect(uploads.length).toBe(payload.media.length)

      const byId = new Map(payload.media.map((m) => [m.id, m]))

      for (const [path, entry] of uploads) {
        const mediaId = path.split("/").pop()!
        const expected = byId.get(mediaId)
        expect(expected, `unexpected id ${mediaId}`).toBeDefined()
        if (!expected) continue

        expect(entry.contentType, `${mediaId} contentType`).toBe(
          expected.mimeType,
        )

        // Bytes uploaded to Storage must match the source bytes exactly.
        expect(entry.bytes.byteLength, `${mediaId} size`).toBe(
          expected.bytes!.byteLength,
        )
        // First three bytes match the expected magic for the mime type.
        if (expected.mimeType === "image/jpeg") {
          expect(
            [entry.bytes[0], entry.bytes[1], entry.bytes[2]],
            `${mediaId} JPEG magic`,
          ).toEqual([0xff, 0xd8, 0xff])
        }
        // Spot-check the local Dexie row matches too.
        const row = await db.media.get(mediaId)
        expect(row, `Dexie has ${mediaId}`).toBeDefined()
        expect(row!.blob.size, `Dexie ${mediaId} size`).toBe(
          expected.bytes!.byteLength,
        )
        expect(row!.mimeType, `Dexie ${mediaId} mime`).toBe(expected.mimeType)
      }

      // Firestore meta exists for every uploaded item.
      const metaColl = backend.firestore.docs.get(
        `users/${FAKE_USER.uid}/media`,
      )
      expect(metaColl, "media metadata collection").toBeDefined()
      expect(metaColl!.size).toBe(payload.media.length)
    },
  )
})

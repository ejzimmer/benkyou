import { beforeEach, describe, expect, it, vi } from "vitest"
import type { User } from "firebase/auth"
import { db } from "../lib/db/schema"
import { resetDatabase } from "../test/db"
import { applyBulkImport } from "./bulkImport"
import type { BulkImportPayload } from "../lib/import/types"
import { recordTombstone } from "../lib/sync/tombstones"
import { tombstoneId } from "../lib/sync/syncCompare"

const mocks = vi.hoisted(() => ({
  upsertDeckRemote: vi.fn(),
  deleteTombstoneRemote: vi.fn(),
  upsertMediaMetaRemote: vi.fn(),
  uploadMediaBlob: vi.fn(),
  pushCardRemote: vi.fn(),
  pushSchedulingRemote: vi.fn(),
  pushLocalMediaToRemote: vi.fn(),
}))

vi.mock("../lib/firebase", () => ({
  getFirestoreDb: () => ({}),
  getFirebaseStorage: () => ({}),
}))

vi.mock("../lib/sync/firestoreSync", () => ({
  upsertDeckRemote: mocks.upsertDeckRemote,
  deleteTombstoneRemote: mocks.deleteTombstoneRemote,
  upsertMediaMetaRemote: mocks.upsertMediaMetaRemote,
}))

vi.mock("../lib/sync/mediaSync", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../lib/sync/mediaSync")>()
  return {
    ...mod,
    uploadMediaBlob: mocks.uploadMediaBlob,
    pushLocalMediaToRemote: mocks.pushLocalMediaToRemote,
  }
})

vi.mock("./decks", () => ({
  pushCardRemote: mocks.pushCardRemote,
  pushSchedulingRemote: mocks.pushSchedulingRemote,
}))

const user = { uid: "test-uid" } as User

const payload: BulkImportPayload = {
  deck: { id: "deck-1", name: "Imported", updatedAt: 200 },
  media: [
    {
      id: "anki-media-sample_jpg",
      mimeType: "image/jpeg",
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
    },
  ],
  cards: [
    {
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      updatedAt: 200,
      content: {
        wordJa: "陣",
        definitionsEn: ["formation"],
        images: ["anki-media-sample_jpg"],
        exampleSentences: [],
        synonymsJa: [],
      },
    },
  ],
  scheduling: [],
}

describe("applyBulkImport", () => {
  beforeEach(async () => {
    await resetDatabase()
    vi.clearAllMocks()
  })

  it("stores media rows locally for review", async () => {
    await applyBulkImport(payload, null)
    const row = await db.media.get("anki-media-sample_jpg")
    expect(row).toMatchObject({
      id: "anki-media-sample_jpg",
      mimeType: "image/jpeg",
    })
    expect(row!.blob).toBeDefined()
  })

  it("clears stale tombstones and writes Firestore media meta when signed in", async () => {
    await recordTombstone("deck", payload.deck.id, 50)
    await recordTombstone("media", payload.media[0].id, 50)

    await applyBulkImport(payload, user)

    expect(
      await db.tombstones.get(tombstoneId("deck", payload.deck.id)),
    ).toBeUndefined()
    expect(mocks.upsertDeckRemote).toHaveBeenCalled()
    expect(mocks.deleteTombstoneRemote).toHaveBeenCalledWith(
      expect.anything(),
      "test-uid",
      "deck:deck-1",
    )
    expect(mocks.uploadMediaBlob).toHaveBeenCalled()
    expect(mocks.upsertMediaMetaRemote).toHaveBeenCalledWith(
      expect.anything(),
      "test-uid",
      expect.objectContaining({ id: "anki-media-sample_jpg" }),
    )
  })
})

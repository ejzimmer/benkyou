import { beforeEach, describe, expect, it } from "vitest"
import { createEmptyCard } from "ts-fsrs"
import { db } from "../db/schema"
import { serializeFsrs } from "../srs/schedule"
import { resetDatabase } from "../../test/db"
import type { BulkImportPayload } from "../import/types"
import {
  clearTombstonesForBulkImport,
  remoteTombstoneIdsForBulkImport,
} from "./importTombstones"
import { recordTombstone } from "./tombstones"
import { tombstoneId } from "./syncCompare"

const minimalPayload = (): BulkImportPayload => ({
  deck: { id: "deck-1", name: "Test", updatedAt: 100 },
  media: [{ id: "media-1", mimeType: "image/png", bytes: new Uint8Array([1]) }],
  cards: [
    {
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      updatedAt: 100,
      content: {
        wordJa: "猫",
        definitionsEn: ["cat"],
        images: ["media-1"],
        exampleSentences: [],
        synonymsJa: [],
      },
    },
  ],
  scheduling: [
    {
      id: "card-1:vocab_oral_en",
      cardId: "card-1",
      modeId: "vocab_oral_en",
      fsrs: serializeFsrs(createEmptyCard()),
      due: 1,
      updatedAt: 100,
    },
  ],
})

describe("importTombstones", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("clears tombstones for all imported entities", async () => {
    const payload = minimalPayload()
    await recordTombstone("deck", payload.deck.id, 50)
    await recordTombstone("card", "card-1", 50)
    await recordTombstone("media", "media-1", 50)
    await recordTombstone("scheduling", payload.scheduling[0].id, 50)

    await clearTombstonesForBulkImport(payload)

    expect(await db.tombstones.get(tombstoneId("deck", "deck-1"))).toBeUndefined()
    expect(await db.tombstones.get(tombstoneId("card", "card-1"))).toBeUndefined()
    expect(await db.tombstones.get(tombstoneId("media", "media-1"))).toBeUndefined()
    expect(
      await db.tombstones.get(tombstoneId("scheduling", payload.scheduling[0].id)),
    ).toBeUndefined()
  })

  it("lists remote tombstone doc ids to delete after import", () => {
    const ids = remoteTombstoneIdsForBulkImport(minimalPayload())
    expect(ids).toContain("deck:deck-1")
    expect(ids).toContain("card:card-1")
    expect(ids).toContain("media:media-1")
  })
})

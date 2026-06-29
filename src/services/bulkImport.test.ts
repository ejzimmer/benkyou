import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetDatabase } from "../test/db"
import { applyBulkImport, type ImportProgress } from "./bulkImport"
import { emptyFsrs, serializeFsrs } from "../lib/srs/schedule"
import type { BulkImportPayload } from "../lib/import/types"
import type { Card } from "../domain/types"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../lib/sync/firestoreSync", () => ({
  upsertDeckRemote: vi.fn(),
  upsertCardRemote: vi.fn(),
  upsertSchedulingRemote: vi.fn(),
  deleteTombstoneRemote: vi.fn(),
}))

function vocabularyCard(id: string): Card {
  return {
    id,
    deckId: "deck",
    kind: "vocabulary",
    content: {
      wordJa: id,
      reading: "よみ",
      definitionsEn: ["definition"],
      images: [],
      exampleSentences: [],
      synonymsJa: [],
    },
    updatedAt: 1,
  }
}

function payload(cardIds: string[]): BulkImportPayload {
  const fsrs = serializeFsrs(emptyFsrs())
  return {
    deck: { id: "deck", name: "Deck", updatedAt: 1 },
    cards: cardIds.map(vocabularyCard),
    scheduling: cardIds.map((id) => ({
      id: `${id}:vocab_oral_en`,
      cardId: id,
      modeId: "vocab_oral_en" as const,
      fsrs,
      due: fsrs.due,
      updatedAt: 1,
    })),
    media: [],
  }
}

describe("applyBulkImport progress", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("reports a saving phase with the card total", async () => {
    const events: ImportProgress[] = []
    await applyBulkImport(payload(["a", "b", "c"]), null, (p) => events.push(p))
    expect(events).toContainEqual({ phase: "saving", total: 3 })
  })
})

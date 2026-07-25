import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetDatabase } from "../test/db"
import { applyBulkImport, type ImportProgress } from "./bulkImport"
import { emptyFsrs, serializeFsrs } from "../lib/srs/schedule"
import type { BulkImportPayload } from "../lib/import/types"
import type { Card } from "../domain/types"
import { getFirestoreDb } from "../lib/firebase"
import { pushImportedDeckBatched } from "../lib/sync/firestoreSync"
import type { User } from "firebase/auth"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: vi.fn(() => null),
  isFirebaseConfigured: () => false,
}))

vi.mock("../lib/sync/firestoreSync", () => ({
  pushImportedDeckBatched: vi.fn(async () => {}),
}))

vi.mock("../lib/sync/mediaSync", () => ({
  pushLocalMediaToRemote: vi.fn(),
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

  afterEach(() => {
    vi.mocked(getFirestoreDb).mockReturnValue(null)
    vi.mocked(pushImportedDeckBatched).mockReset()
    vi.mocked(pushImportedDeckBatched).mockImplementation(async () => {})
  })

  it("reports a saving phase with the card total", async () => {
    const events: ImportProgress[] = []
    await applyBulkImport(payload(["a", "b", "c"]), null, (p) => events.push(p))
    expect(events).toContainEqual({ phase: "saving", current: 0, total: 3 })
    expect(events).toContainEqual({ phase: "saving", current: 3, total: 3 })
  })

  it("ticks saving progress every few cards, not just at the end", async () => {
    const events: ImportProgress[] = []
    const ids = Array.from({ length: 12 }, (_, i) => `card-${i}`)
    await applyBulkImport(payload(ids), null, (p) => events.push(p))
    const savingEvents = events.filter((e) => e.phase === "saving")
    expect(savingEvents).toContainEqual({ phase: "saving", current: 5, total: 12 })
    expect(savingEvents).toContainEqual({ phase: "saving", current: 10, total: 12 })
    expect(savingEvents).toContainEqual({ phase: "saving", current: 12, total: 12 })
  })

  it("syncs a signed-in user's import via one batched push, not one call per card/row", async () => {
    vi.mocked(getFirestoreDb).mockReturnValue({} as ReturnType<typeof getFirestoreDb>)
    vi.mocked(pushImportedDeckBatched).mockImplementation(
      async (_fs, _uid, _deck, cards, scheduling, tombstoneIds, onProgress) => {
        const total = 1 + cards.length + scheduling.length + tombstoneIds.length
        onProgress?.(total, total)
      },
    )
    const fakeUser = { uid: "user-1" } as User

    const events: ImportProgress[] = []
    const ids = ["a", "b", "c"]
    await applyBulkImport(payload(ids), fakeUser, (p) => events.push(p))

    // One call handles the whole deck — not a loop of individual pushes.
    expect(pushImportedDeckBatched).toHaveBeenCalledTimes(1)
    const call = vi.mocked(pushImportedDeckBatched).mock.calls[0]
    expect(call[1]).toBe("user-1")
    expect(call[2]).toEqual(payload(ids).deck)
    expect(call[3]).toHaveLength(3) // cards
    expect(call[4]).toHaveLength(3) // scheduling rows

    const syncingEvents = events.filter((e) => e.phase === "syncing")
    expect(syncingEvents[0]).toMatchObject({ phase: "syncing", current: 0 })
    const last = syncingEvents[syncingEvents.length - 1]
    expect(last.phase === "syncing" && last.current === last.total).toBe(true)
  })
})

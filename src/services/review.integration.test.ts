import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetDatabase } from "../test/db"
import { createDeck } from "./decks"
import { createVocabularyCard } from "./cards"
import {
  commitJudgement,
  getDueQueue,
  prepareJudgement,
  undoLastJudgement,
} from "./review"
import { loadSchedulingRow } from "./cards"
import { db } from "../lib/db/schema"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../lib/sync/firestoreSync", () => ({
  pushLocalToRemote: vi.fn(),
  pullRemoteToLocal: vi.fn(),
  upsertDeckRemote: vi.fn(),
  upsertCardRemote: vi.fn(),
  upsertSchedulingRemote: vi.fn(),
}))

describe("review + scheduling (IndexedDB)", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("creates due rows for each review mode and updates after judgement", async () => {
    const deck = await createDeck("D", null)
    const card = await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      null,
    )

    const rowBefore = await loadSchedulingRow(
      card.id,
      "vocab_type_reading",
    )
    expect(rowBefore).toBeDefined()
    const dueBefore = rowBefore!.due

    const queue = await getDueQueue(dueBefore + 1)
    expect(queue.some((q) => q.card.id === card.id)).toBe(true)

    const snap = await prepareJudgement(card.id, "vocab_type_reading")
    expect(snap).not.toBeNull()

    await commitJudgement(
      card.id,
      "vocab_type_reading",
      1500,
      true,
      snap,
      null,
    )

    const undoRow = await db.reviewUndo.orderBy("ts").last()
    expect(undoRow?.linkedEventId).toBeDefined()
    expect(await db.reviewEvents.get(undoRow!.linkedEventId!)).not.toBeUndefined()

    const rowAfter = await loadSchedulingRow(
      card.id,
      "vocab_type_reading",
    )
    expect(rowAfter!.due).not.toBe(dueBefore)
  })

  it("undoLastJudgement restores prior scheduling row", async () => {
    const deck = await createDeck("D", null)
    const card = await createVocabularyCard(
      deck.id,
      {
        wordJa: "犬",
        reading: "いぬ",
        definitionsEn: ["dog"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      null,
    )

    const snap = await prepareJudgement(card.id, "vocab_oral_en")
    const beforeDue = (await loadSchedulingRow(card.id, "vocab_oral_en"))!.due

    await commitJudgement(
      card.id,
      "vocab_oral_en",
      800,
      true,
      snap,
      null,
    )
    const afterDue = (await loadSchedulingRow(card.id, "vocab_oral_en"))!.due
    expect(afterDue).not.toBe(beforeDue)

    const eventId = (await db.reviewEvents.orderBy("ts").last())!.id

    const undone = await undoLastJudgement(null)
    expect(undone).not.toBeNull()
    const restored = await loadSchedulingRow(card.id, "vocab_oral_en")
    expect(restored!.due).toBe(beforeDue)
    expect(await db.reviewEvents.get(eventId)).toBeUndefined()
  })
})

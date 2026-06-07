import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetDatabase } from "../test/db"
import { createDeck } from "./decks"
import { createVocabularyCard } from "./cards"
import {
  commitJudgement,
  getDueQueue,
  prepareJudgement,
  randomizeDueQueue,
  undoLastJudgement,
  type DueItem,
} from "./review"
import { loadSchedulingRow } from "./cards"
import { db } from "../lib/db/schema"
import type { Card, ReviewModeId } from "../domain/types"

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

function dueItem(
  card: Card,
  modeId: ReviewModeId,
  due: number,
): DueItem {
  return { card, modeId, due }
}

describe("review + scheduling (IndexedDB)", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("randomizes due review modes while spacing prompts from the same card", () => {
    const cards = ["a", "b", "c"].map(vocabularyCard)
    const queue = [
      dueItem(cards[0], "vocab_oral_en", 1),
      dueItem(cards[0], "vocab_type_reading", 2),
      dueItem(cards[1], "vocab_oral_en", 3),
      dueItem(cards[1], "vocab_type_reading", 4),
      dueItem(cards[2], "vocab_oral_en", 5),
      dueItem(cards[2], "vocab_type_reading", 6),
    ]

    const randomized = randomizeDueQueue(queue, () => 0)

    expect(randomized.map((item) => item.card.id).join(",")).not.toBe(
      "a,a,b,b,c,c",
    )
    for (let i = 1; i < randomized.length; i += 1) {
      expect(randomized[i].card.id).not.toBe(randomized[i - 1].card.id)
    }
    expect(new Set(randomized)).toEqual(new Set(queue))
  })

  it("only places the same card consecutively when no other card is available", () => {
    const cardA = vocabularyCard("a")
    const cardB = vocabularyCard("b")
    const queue = [
      dueItem(cardA, "vocab_oral_en", 1),
      dueItem(cardA, "vocab_type_reading", 2),
      dueItem(cardA, "vocab_type_word_from_clue", 3),
      dueItem(cardB, "vocab_oral_en", 4),
    ]

    const randomized = randomizeDueQueue(queue, () => 0)

    expect(randomized.slice(0, 3).map((item) => item.card.id)).toEqual([
      "a",
      "b",
      "a",
    ])
    expect(new Set(randomized)).toEqual(new Set(queue))
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

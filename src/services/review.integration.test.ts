import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetDatabase } from "../test/db"
import { createDeck } from "./decks"
import { createVocabularyCard } from "./cards"
import {
  commitJudgement,
  endOfLocalDay,
  getDueCountsByDeck,
  getDueQueue,
  prepareJudgement,
  randomizeDueQueue,
  requeueAfterIncorrect,
  undoLastJudgement,
  type DueItem,
} from "./review"
import { loadSchedulingRow } from "./cards"
import { db, type SchedulingRow } from "../lib/db/schema"
import { emptyFsrs, serializeFsrs } from "../lib/srs/schedule"
import type { Card, ReviewModeId } from "../domain/types"

const startOfLocalDay = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

async function seedDueCard(
  id: string,
  modeId: ReviewModeId,
  due: number,
  deckId = "deck",
): Promise<void> {
  const card = vocabularyCard(id, deckId)
  await db.cards.put(card)
  const row: SchedulingRow = {
    id: `${id}:${modeId}`,
    cardId: id,
    modeId,
    fsrs: serializeFsrs(emptyFsrs()),
    due,
    updatedAt: 1,
  }
  await db.scheduling.put(row)
}

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

function vocabularyCard(id: string, deckId?: string): Card {
  return {
    id,
    deckId: deckId ?? "deck",
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
    const cards = ["a", "b", "c"].map((id) => vocabularyCard(id))
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

  it("requeues a wrongly-answered item without landing it next to the same card", () => {
    const cardX = vocabularyCard("x")
    const cardZ = vocabularyCard("z")
    // The card's other due mode (x:vocab_type_reading) already sits at the
    // end of the queue — naively appending the just-missed item there would
    // put two "x" prompts back to back.
    const rest = [
      dueItem(cardZ, "vocab_oral_en", 1),
      dueItem(cardX, "vocab_type_reading", 2),
    ]
    const missed = dueItem(cardX, "vocab_oral_en", 3)

    const requeued = requeueAfterIncorrect(rest, missed)

    for (let i = 1; i < requeued.length; i += 1) {
      expect(requeued[i].card.id).not.toBe(requeued[i - 1].card.id)
    }
    expect(new Set(requeued)).toEqual(new Set([...rest, missed]))
  })

  it("falls back to appending at the end when the card dominates the remaining queue", () => {
    const cardX = vocabularyCard("x")
    const rest = [dueItem(cardX, "vocab_type_reading", 1)]
    const missed = dueItem(cardX, "vocab_oral_en", 2)

    const requeued = requeueAfterIncorrect(rest, missed)

    expect(requeued).toEqual([...rest, missed])
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

describe("endOfLocalDay", () => {
  it("returns the final instant of the day in the local timezone", () => {
    const eod = new Date(endOfLocalDay(Date.parse("2026-06-27T09:15:00")))
    expect(eod.getHours()).toBe(23)
    expect(eod.getMinutes()).toBe(59)
    expect(eod.getSeconds()).toBe(59)
    expect(eod.getMilliseconds()).toBe(999)
  })

  it("stays on the same local calendar day and never moves backwards", () => {
    const now = Date.now()
    const eod = endOfLocalDay(now)
    expect(eod).toBeGreaterThanOrEqual(now)
    expect(new Date(eod).getDate()).toBe(new Date(now).getDate())
  })
})

describe("getDueQueue day window", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("shows every card due at any point today, whatever time review starts", async () => {
    const now = Date.now()
    // A morning card, a card due at the moment of review, and an evening card
    // should all be surfaced together regardless of the current time of day.
    await seedDueCard("morning", "vocab_oral_en", startOfLocalDay(now))
    await seedDueCard("now", "vocab_oral_en", now)
    await seedDueCard("evening", "vocab_oral_en", endOfLocalDay(now))

    const queue = await getDueQueue()
    const ids = new Set(queue.map((item) => item.card.id))

    expect(ids).toContain("morning")
    expect(ids).toContain("now")
    expect(ids).toContain("evening")
  })

  it("excludes cards that only become due tomorrow", async () => {
    const now = Date.now()
    await seedDueCard("today", "vocab_oral_en", endOfLocalDay(now))
    await seedDueCard("tomorrow", "vocab_oral_en", endOfLocalDay(now) + 1)

    const queue = await getDueQueue()
    const ids = new Set(queue.map((item) => item.card.id))

    expect(ids).toContain("today")
    expect(ids).not.toContain("tomorrow")
  })
})

describe("getDueCountsByDeck", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("counts due cards per deck, skipping decks with nothing due", async () => {
    const now = Date.now()
    await seedDueCard("a1", "vocab_oral_en", now, "deckA")
    await seedDueCard("a2", "vocab_oral_en", now, "deckA")
    await seedDueCard("b1", "vocab_oral_en", now, "deckB")
    await seedDueCard("c1", "vocab_oral_en", endOfLocalDay(now) + 1, "deckC")

    const counts = await getDueCountsByDeck()

    expect(counts.get("deckA")).toBe(2)
    expect(counts.get("deckB")).toBe(1)
    expect(counts.has("deckC")).toBe(false)
  })

  it("doesn't scan every card in the collection, only the ones actually due", async () => {
    const now = Date.now()
    await seedDueCard("due1", "vocab_oral_en", now, "deckA")
    // A large number of not-due cards — cost should not scale with these.
    for (let i = 0; i < 200; i++) {
      await seedDueCard(`future${i}`, "vocab_oral_en", endOfLocalDay(now) + 1, "deckB")
    }

    const toArraySpy = vi.spyOn(db.cards, "toArray")
    const counts = await getDueCountsByDeck()
    expect(toArraySpy).not.toHaveBeenCalled()
    expect(counts.get("deckA")).toBe(1)
    toArraySpy.mockRestore()
  })
})

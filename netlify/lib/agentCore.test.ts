import { describe, expect, it } from "vitest"
import { Rating, State, createEmptyCard } from "ts-fsrs"
import type { Card } from "../../src/domain/types"
import type { SchedulingRow } from "../../src/lib/db/schema"
import { serializeFsrs } from "../../src/lib/srs/schedule"
import {
  isAgentRating,
  isDueForTranslation,
  japaneseWordForCard,
  ratingToGrade,
  schedulingPriorityWeight,
  toAgentCard,
  translationModeForCard,
  weightedSampleWithoutReplacement,
} from "./agentCore"

const vocabCard: Card = {
  id: "card-vocab",
  deckId: "deck-1",
  kind: "vocabulary",
  content: {
    wordJa: "本",
    reading: "ほん",
    definitionsEn: ["book", ""],
    images: [],
    exampleSentences: ["本を読みます"],
  },
  updatedAt: 0,
}

const grammarCard: Card = {
  id: "card-grammar",
  deckId: "deck-1",
  kind: "grammar",
  content: {
    sentenceWithGap: "私は___です",
    gapMarker: "___",
    construction: "学生",
    translationEn: "I am a student",
    readings: {},
    images: [],
  },
  updatedAt: 0,
}

function rowFor(card: Card, overrides: Partial<SchedulingRow> = {}): SchedulingRow {
  return {
    id: `${card.id}:${translationModeForCard(card)}`,
    cardId: card.id,
    modeId: translationModeForCard(card),
    fsrs: serializeFsrs(createEmptyCard()),
    due: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe("translationModeForCard / japaneseWordForCard", () => {
  it("picks the supply-the-word mode for vocabulary and the gap-fill mode for grammar", () => {
    expect(translationModeForCard(vocabCard)).toBe("vocab_type_word_from_clue")
    expect(translationModeForCard(grammarCard)).toBe("grammar_type_construction")
  })

  it("returns the japanese word / construction", () => {
    expect(japaneseWordForCard(vocabCard)).toBe("本")
    expect(japaneseWordForCard(grammarCard)).toBe("学生")
  })
})

describe("toAgentCard", () => {
  it("shapes a vocabulary card", () => {
    expect(toAgentCard(vocabCard, 123)).toEqual({
      id: "card-vocab",
      kind: "vocabulary",
      japaneseWord: "本",
      meaning: "book",
      exampleSentences: ["本を読みます"],
      due: 123,
    })
  })

  it("shapes a grammar card, using the gapped sentence as the example", () => {
    expect(toAgentCard(grammarCard, 456)).toEqual({
      id: "card-grammar",
      kind: "grammar",
      japaneseWord: "学生",
      meaning: "I am a student",
      exampleSentences: ["私は___です"],
      due: 456,
    })
  })
})

describe("isDueForTranslation", () => {
  it("rejects a row that isn't due yet", () => {
    const row = rowFor(vocabCard, { due: 2000 })
    expect(isDueForTranslation(vocabCard, row, 1000)).toBe(false)
  })

  it("accepts a due row on the translation mode", () => {
    const row = rowFor(vocabCard, { due: 1000 })
    expect(isDueForTranslation(vocabCard, row, 2000)).toBe(true)
  })

  it("rejects a row for a different mode on the same card", () => {
    const row = rowFor(vocabCard, { due: 0, modeId: "vocab_oral_en" })
    expect(isDueForTranslation(vocabCard, row, 1000)).toBe(false)
  })

  it("rejects a mode the card's current content no longer supports", () => {
    const bareCard: Card = {
      ...vocabCard,
      content: { ...vocabCard.content, definitionsEn: [], images: [] },
    }
    const row = rowFor(vocabCard, { due: 0 })
    expect(isDueForTranslation(bareCard, row, 1000)).toBe(false)
  })
})

describe("schedulingPriorityWeight", () => {
  it("increases with how many days overdue the row is", () => {
    const now = 10 * DAY
    const barelyOverdue = schedulingPriorityWeight(rowFor(vocabCard, { due: now - 1 * DAY }), now)
    const veryOverdue = schedulingPriorityWeight(rowFor(vocabCard, { due: now - 10 * DAY }), now)
    expect(veryOverdue).toBeGreaterThan(barelyOverdue)
  })

  it("weights a relearning card higher than a fresh one at the same due date", () => {
    const now = 1000
    const fresh = rowFor(vocabCard, { due: 0 })
    const relearning = rowFor(vocabCard, {
      due: 0,
      fsrs: serializeFsrs({ ...createEmptyCard(), state: State.Relearning }),
    })
    expect(schedulingPriorityWeight(relearning, now)).toBeGreaterThan(
      schedulingPriorityWeight(fresh, now),
    )
  })
})

const DAY = 86_400_000

describe("weightedSampleWithoutReplacement", () => {
  it("returns at most `count` items with no duplicates", () => {
    const items = [1, 2, 3, 4, 5].map((n) => ({ item: n, weight: 1 }))
    const picked = weightedSampleWithoutReplacement(items, 3, () => 0.999)
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
  })

  it("returns everything when count exceeds the pool size", () => {
    const items = [1, 2].map((n) => ({ item: n, weight: 1 }))
    const picked = weightedSampleWithoutReplacement(items, 5, Math.random)
    expect(picked.sort()).toEqual([1, 2])
  })

  it("heavily favours a much higher weight with a fixed random source", () => {
    const items = [
      { item: "rare", weight: 0.001 },
      { item: "common", weight: 1000 },
    ]
    // random() close to 0 always lands in the first slot scanned by cumulative weight
    const picked = weightedSampleWithoutReplacement(items, 1, () => 0)
    expect(picked).toEqual(["rare"])
    const pickedHigh = weightedSampleWithoutReplacement(items, 1, () => 0.9999999)
    expect(pickedHigh).toEqual(["common"])
  })
})

describe("isAgentRating / ratingToGrade", () => {
  it("accepts the four known ratings and rejects anything else", () => {
    expect(isAgentRating("easy")).toBe(true)
    expect(isAgentRating("ok")).toBe(true)
    expect(isAgentRating("hard")).toBe(true)
    expect(isAgentRating("incorrect")).toBe(true)
    expect(isAgentRating("good")).toBe(false)
    expect(isAgentRating(42)).toBe(false)
  })

  it("maps ratings to FSRS grades", () => {
    expect(ratingToGrade("easy")).toBe(Rating.Easy)
    expect(ratingToGrade("ok")).toBe(Rating.Good)
    expect(ratingToGrade("hard")).toBe(Rating.Hard)
    expect(ratingToGrade("incorrect")).toBe(Rating.Again)
  })
})

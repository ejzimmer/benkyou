import { describe, expect, it } from "vitest"
import {
  containsKanji,
  reviewModesForCard,
  type Card,
} from "./types"

describe("containsKanji", () => {
  it("returns false for kana only", () => {
    expect(containsKanji("すし")).toBe(false)
  })
  it("returns true for CJK unified ideographs", () => {
    expect(containsKanji("寿司")).toBe(true)
    expect(containsKanji("勉強する")).toBe(true)
  })
})

describe("reviewModesForCard", () => {
  it("vocabulary without kanji omits reading mode", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "vocabulary",
      updatedAt: 1,
      content: {
        wordJa: "すし",
        definitionsEn: ["sushi"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    }
    expect(reviewModesForCard(card)).toEqual([
      "vocab_oral_en",
      "vocab_type_word_from_clue",
    ])
  })

  it("vocabulary with kanji inserts reading mode", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "vocabulary",
      updatedAt: 1,
      content: {
        wordJa: "寿司",
        reading: "すし",
        definitionsEn: ["sushi"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    }
    expect(reviewModesForCard(card)).toEqual([
      "vocab_oral_en",
      "vocab_type_reading",
      "vocab_type_word_from_clue",
    ])
  })

  it("grammar has construction + oral modes", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "I am a student",
        readings: {},
        images: [],
        synonymsJa: [],
      },
    }
    expect(reviewModesForCard(card)).toEqual([
      "grammar_type_construction",
      "grammar_oral_meaning",
    ])
  })
})

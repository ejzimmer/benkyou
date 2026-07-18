import { describe, expect, it } from "vitest"
import {
  containsKanji,
  reviewModesForCard,
  type Card,
  type GrammarCardContent,
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

  it("pronunciation-only card has type-reading mode only", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "vocabulary",
      updatedAt: 1,
      content: {
        wordJa: "陣",
        reading: "じん",
        definitionsEn: [],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    }
    expect(reviewModesForCard(card)).toEqual(["vocab_type_reading"])
  })

  it("image-only card omits oral and reading modes", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "vocabulary",
      updatedAt: 1,
      content: {
        wordJa: "ねこ",
        definitionsEn: [],
        images: ["img-1"],
        exampleSentences: [],
        synonymsJa: [],
      },
    }
    expect(reviewModesForCard(card)).toEqual(["vocab_type_word_from_clue"])
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

  it("grammar inserts a reading mode once constructionReading is set", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        constructionReading: "がくせい",
        translationEn: "I am a student",
        readings: {},
        images: [],
        synonymsJa: [],
      },
    }
    expect(reviewModesForCard(card)).toEqual([
      "grammar_type_construction",
      "grammar_type_reading",
      "grammar_oral_meaning",
    ])
  })

  it("grammar with singleSided set only gets the construction mode, even with a reading and translation", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "プレゼンテーションを見___が、つまらなかったから、出ました。",
        gapMarker: "___",
        construction: "ました",
        constructionReading: "ました",
        translationEn: "I watched the presentation, but it was boring so I left.",
        readings: {},
        images: [],
        synonymsJa: [],
        singleSided: true,
      },
    }
    expect(reviewModesForCard(card)).toEqual(["grammar_type_construction"])
  })

  it("grammar with a still-unmigrated legacy grammarPoint stays single-sided", () => {
    // Cards saved before grammarPoint was renamed to singleSided keep
    // whatever shape they were written with — this must keep working
    // without a manual migration, or every pre-existing single-sided card
    // would silently start testing both sides again.
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "プレゼンテーションを見___が、つまらなかったから、出ました。",
        gapMarker: "___",
        construction: "ました",
        constructionReading: "ました",
        translationEn: "I watched the presentation, but it was boring so I left.",
        readings: {},
        images: [],
        synonymsJa: [],
        grammarPoint: "conjugation",
      } as GrammarCardContent,
    }
    expect(reviewModesForCard(card)).toEqual(["grammar_type_construction"])
  })

  it("vocabulary phrase word gets a reading mode from readingParts", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "vocabulary",
      updatedAt: 1,
      content: {
        wordJa: "結論に至る",
        readingParts: { 結論: "けつろん", 至る: "いたる" },
        definitionsEn: ["to reach a conclusion"],
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

  it("vocabulary phrase word omits the reading mode with only a single reading part", () => {
    const card: Card = {
      id: "1",
      deckId: "d",
      kind: "vocabulary",
      updatedAt: 1,
      content: {
        wordJa: "結論に至る",
        readingParts: { 結論: "けつろん" },
        definitionsEn: ["to reach a conclusion"],
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
})

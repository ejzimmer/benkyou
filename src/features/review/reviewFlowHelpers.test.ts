import { describe, expect, it } from "vitest"
import {
  answerMissingKanji,
  answersMatch,
  expectedAnswer,
  hasNonHiraganaReadingAnswer,
  isReadingTypingMode,
  requiresTyping,
  reviewModeLabel,
  vocabExampleReadings,
} from "./reviewFlowHelpers"
import type { Card } from "../../domain/types"

const vocabCard = (): Extract<Card, { kind: "vocabulary" }> => ({
  id: "1",
  deckId: "d",
  kind: "vocabulary",
  updatedAt: 1,
  content: {
    wordJa: "猫",
    reading: "ねこ",
    definitionsEn: ["cat"],
    images: [],
    exampleSentences: [],
    synonymsJa: [],
  },
})

describe("reviewFlowHelpers", () => {
  it("requiresTyping matches typed modes only", () => {
    expect(requiresTyping("vocab_oral_en")).toBe(false)
    expect(requiresTyping("vocab_type_reading")).toBe(true)
  })

  it("expectedAnswer returns primary strings", () => {
    const c = vocabCard()
    expect(expectedAnswer(c, "vocab_type_reading")).toBe("ねこ")
    expect(expectedAnswer(c, "vocab_type_word_from_clue")).toBe("猫")
  })

  it("vocabExampleReadings includes the per-phrase map plus the whole-word reading", () => {
    const c = vocabCard().content
    expect(
      vocabExampleReadings({ ...c, readings: { 大好き: "だいすき" } }),
    ).toEqual({ 大好き: "だいすき", 猫: "ねこ" })
  })

  it("vocabExampleReadings does not override an explicit map entry for the word", () => {
    const c = vocabCard().content
    expect(
      vocabExampleReadings({ ...c, readings: { 猫: "みょう" } }),
    ).toEqual({ 猫: "みょう" })
  })

  it("vocabExampleReadings omits the word reading for kana-only words", () => {
    expect(
      vocabExampleReadings({
        wordJa: "ねこ",
        reading: "ねこ",
        definitionsEn: [],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toEqual({})
  })

  it("expectedAnswer joins a phrase word's per-segment readings for vocab_type_reading", () => {
    const c: Card = {
      id: "1",
      deckId: "d",
      kind: "vocabulary",
      updatedAt: 1,
      content: {
        wordJa: "結論に至る",
        readingParts: { 結論: "けつろん", 至る: "いたる" },
        definitionsEn: [],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    }
    expect(expectedAnswer(c, "vocab_type_reading")).toBe("けつろん, いたる")
  })

  it("expectedAnswer joins a construction's per-segment readings for grammar_type_reading", () => {
    const c: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "___",
        gapMarker: "___",
        construction: "結論に至る",
        translationEn: "",
        constructionReadingParts: { 結論: "けつろん", 至る: "いたる" },
        readings: {},
        images: [],
        synonymsJa: [],
      },
    }
    expect(expectedAnswer(c, "grammar_type_reading")).toBe("けつろん, いたる")
  })

  it("expectedAnswer uses constructionReading directly for grammar_type_reading when set", () => {
    const c: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "___",
        gapMarker: "___",
        construction: "芳しく",
        constructionReading: "かんばしい",
        translationEn: "",
        readings: {},
        images: [],
        synonymsJa: [],
      },
    }
    expect(expectedAnswer(c, "grammar_type_reading")).toBe("かんばしい")
  })

  it("reviewModeLabel uses the generic construction label when no grammarPoint is set", () => {
    const c: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "",
        readings: {},
        images: [],
        synonymsJa: [],
      },
    }
    expect(reviewModeLabel(c, "grammar_type_construction")).toBe(
      "Type the construction",
    )
  })

  it("reviewModeLabel asks about the grammar point when one is set", () => {
    const c: Card = {
      id: "1",
      deckId: "d",
      kind: "grammar",
      updatedAt: 1,
      content: {
        sentenceWithGap: "プレゼンテーションを見___が、つまらなかったから、出ました。",
        gapMarker: "___",
        construction: "ました",
        translationEn: "",
        readings: {},
        images: [],
        synonymsJa: [],
        grammarPoint: "conjugation",
      },
    }
    expect(reviewModeLabel(c, "grammar_type_construction")).toBe(
      "What's the correct conjugation?",
    )
  })

  it("answersMatch is lenient about the separator between phrase-reading segments", () => {
    expect(
      answersMatch("vocab_type_reading", "けつろん、いたる", "けつろん, いたる"),
    ).toBe(true)
    expect(answersMatch("vocab_type_reading", "けつろん", "けつろんに")).toBe(
      false,
    )
  })

  it("hasNonHiraganaReadingAnswer tolerates the segment separator between valid hiragana parts", () => {
    expect(hasNonHiraganaReadingAnswer("けつろん, いたる")).toBe(false)
    expect(hasNonHiraganaReadingAnswer("けつろん、いたる")).toBe(false)
    expect(hasNonHiraganaReadingAnswer("けつろん")).toBe(false)
  })

  it("hasNonHiraganaReadingAnswer still catches kanji/katakana within a segment", () => {
    expect(hasNonHiraganaReadingAnswer("結論, いたる")).toBe(true)
    expect(hasNonHiraganaReadingAnswer("ケツロン")).toBe(true)
  })

  it("answerMissingKanji flags a kana-only answer when the expected word has kanji", () => {
    expect(answerMissingKanji("ねこ", "猫")).toBe(true)
    expect(answerMissingKanji("猫", "猫")).toBe(false)
  })

  it("answerMissingKanji does not flag kana-only words", () => {
    expect(answerMissingKanji("ねこ", "ねこ")).toBe(false)
  })

  it("requiresTyping and isReadingTypingMode cover grammar_type_reading", () => {
    expect(requiresTyping("grammar_type_reading")).toBe(true)
    expect(isReadingTypingMode("grammar_type_reading")).toBe(true)
    expect(isReadingTypingMode("vocab_type_reading")).toBe(true)
    expect(isReadingTypingMode("grammar_type_construction")).toBe(false)
  })
})

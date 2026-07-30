import { describe, expect, it } from "vitest"
import {
  answerMissingKanji,
  answersMatch,
  appliesConfusedWordCheck,
  expectedAnswer,
  hasMissingDoubledN,
  hasNonHiraganaReadingAnswer,
  isReadingTypingMode,
  requiresTyping,
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
  },
})

describe("reviewFlowHelpers", () => {
  it("requiresTyping matches typed modes only", () => {
    expect(requiresTyping("vocab_oral_en")).toBe(false)
    expect(requiresTyping("vocab_type_reading")).toBe(true)
  })

  it("appliesConfusedWordCheck matches only word/construction typing modes", () => {
    expect(appliesConfusedWordCheck("vocab_type_word_from_clue")).toBe(true)
    expect(appliesConfusedWordCheck("grammar_type_construction")).toBe(true)
    expect(appliesConfusedWordCheck("vocab_type_reading")).toBe(false)
    expect(appliesConfusedWordCheck("vocab_oral_en")).toBe(false)
    expect(appliesConfusedWordCheck("grammar_type_reading")).toBe(false)
    expect(appliesConfusedWordCheck("grammar_oral_meaning")).toBe(false)
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
      },
    }
    expect(expectedAnswer(c, "grammar_type_reading")).toBe("かんばしい")
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

  it("answerMissingKanji flags a multi-gap construction answer with a kana-only gap", () => {
    expect(answerMissingKanji("そのけつろん、至る", "その結論、至る")).toBe(true)
    expect(answerMissingKanji("その結論、至る", "その結論、至る")).toBe(false)
  })

  it("answerMissingKanji does not flag when gap counts differ", () => {
    expect(answerMissingKanji("けつろん", "結論、至る")).toBe(false)
  })

  it("hasMissingDoubledN flags a single-segment reading missing a doubled n", () => {
    expect(hasMissingDoubledN("うねいしゃ", "うんえいしゃ")).toBe(true)
  })

  it("hasMissingDoubledN flags just the affected segment in a multi-gap answer", () => {
    expect(hasMissingDoubledN("けつろん, さない", "けつろん, さんあい")).toBe(
      true,
    )
  })

  it("hasMissingDoubledN does not flag an already-correct answer", () => {
    expect(hasMissingDoubledN("うんえいしゃ", "うんえいしゃ")).toBe(false)
  })

  it("hasMissingDoubledN does not flag a wrong answer with an unrelated mistake", () => {
    expect(hasMissingDoubledN("ねこ", "いぬ")).toBe(false)
  })

  it("hasMissingDoubledN does not flag when segment counts differ", () => {
    expect(hasMissingDoubledN("さない", "けつろん, さんあい")).toBe(false)
  })

  it("hasMissingDoubledN requires every differing segment to be explained by the n slip", () => {
    // First segment has an unrelated typo, second is the n slip — not a pure case.
    expect(hasMissingDoubledN("ねほん, さない", "にほん, さんあい")).toBe(
      false,
    )
  })

  it("requiresTyping and isReadingTypingMode cover grammar_type_reading", () => {
    expect(requiresTyping("grammar_type_reading")).toBe(true)
    expect(isReadingTypingMode("grammar_type_reading")).toBe(true)
    expect(isReadingTypingMode("vocab_type_reading")).toBe(true)
    expect(isReadingTypingMode("grammar_type_construction")).toBe(false)
  })
})

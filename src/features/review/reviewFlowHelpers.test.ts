import { describe, expect, it } from "vitest"
import {
  expectedAnswer,
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
})

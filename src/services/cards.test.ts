import { describe, expect, it } from "vitest"
import {
  validateGrammar,
  validateVocabulary,
} from "./cards"

describe("validateVocabulary", () => {
  it("requires a word", () => {
    expect(
      validateVocabulary({
        wordJa: "   ",
        definitionsEn: ["x"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toMatch(/required/)
  })

  it("allows kanji word with English only (no reading)", () => {
    expect(
      validateVocabulary({
        wordJa: "猫",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toBeNull()
  })

  it("allows pronunciation-only kanji card", () => {
    expect(
      validateVocabulary({
        wordJa: "陣",
        reading: "じん",
        definitionsEn: [],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toBeNull()
  })

  it("rejects reading on kana-only word", () => {
    expect(
      validateVocabulary({
        wordJa: "ねこ",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toMatch(/Pronunciation/)
  })

  it("allows kana-only word without reading field", () => {
    expect(
      validateVocabulary({
        wordJa: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toBeNull()
  })

  it("requires definition or image", () => {
    expect(
      validateVocabulary({
        wordJa: "ねこ",
        definitionsEn: ["", ""],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toMatch(/pronunciation|English|image/i)
  })

  it("accepts image-only card", () => {
    expect(
      validateVocabulary({
        wordJa: "ねこ",
        definitionsEn: [],
        images: ["blob-id"],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toBeNull()
  })
})

describe("validateGrammar", () => {
  it("requires gap marker in sentence", () => {
    expect(
      validateGrammar({
        sentenceWithGap: "テスト",
        gapMarker: "___",
        construction: "x",
        translationEn: "y",
        readings: {},
        images: [],
        synonymsJa: [],
      }),
    ).toMatch(/gap marker/)
  })

  it("accepts valid grammar card", () => {
    expect(
      validateGrammar({
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "I am ~",
        readings: {},
        images: [],
        synonymsJa: [],
      }),
    ).toBeNull()
  })

  it("accepts grammar card with image only", () => {
    expect(
      validateGrammar({
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "",
        readings: {},
        images: ["blob-id"],
        synonymsJa: [],
      }),
    ).toBeNull()
  })

  it("accepts multiple gap markers", () => {
    expect(
      validateGrammar({
        sentenceWithGap: "___を___",
        gapMarker: "___",
        construction: "流し, 呼ぶ",
        translationEn: "Call a carriage",
        readings: {},
        images: [],
        synonymsJa: [],
      }),
    ).toBeNull()
  })
})

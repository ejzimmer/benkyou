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

  it("requires reading when kanji present", () => {
    expect(
      validateVocabulary({
        wordJa: "猫",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }),
    ).toMatch(/Reading/)
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
    ).toMatch(/definition or.*image/i)
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
})

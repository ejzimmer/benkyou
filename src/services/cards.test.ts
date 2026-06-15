import { describe, expect, it } from "vitest"
import {
  grammarFromVocabularyContent,
  validateGrammar,
  validateVocabulary,
  vocabularyFromGrammarContent,
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

describe("card type conversions", () => {
  it("converts grammar content to vocabulary content", () => {
    expect(
      vocabularyFromGrammarContent({
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "student",
        readings: { 学生: "がくせい" },
        images: ["image-1"],
        synonymsJa: ["生徒"],
      }),
    ).toEqual({
      wordJa: "学生",
      reading: "がくせい",
      definitionsEn: ["student"],
      images: ["image-1"],
      exampleSentences: ["私は___です"],
      synonymsJa: ["生徒"],
    })
  })

  it("converts vocabulary content to grammar content", () => {
    expect(
      grammarFromVocabularyContent({
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat", "feline", ""],
        images: ["image-1"],
        exampleSentences: ["猫がいます"],
        synonymsJa: ["ネコ"],
      }),
    ).toEqual({
      sentenceWithGap: "___がいます",
      gapMarker: "___",
      construction: "猫",
      translationEn: "cat; feline",
      readings: { 猫: "ねこ" },
      images: ["image-1"],
      synonymsJa: ["ネコ"],
    })
  })
})

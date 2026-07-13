import { describe, expect, it } from "vitest"
import {
  grammarFromVocabularyContent,
  mergeCardContent,
  normalizeGrammarContent,
  validateGrammar,
  validateVocabulary,
  vocabularyFromGrammarContent,
} from "./cards"
import type { Card } from "../domain/types"

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

  it("rejects a construction with fewer answers than gaps", () => {
    expect(
      validateGrammar({
        sentenceWithGap: "___を___",
        gapMarker: "___",
        construction: "流し",
        translationEn: "Call a carriage",
        readings: {},
        images: [],
        synonymsJa: [],
      }),
    ).toMatch(/2 gaps/)
  })

  it("rejects a construction with more answers than gaps", () => {
    expect(
      validateGrammar({
        sentenceWithGap: "___を___",
        gapMarker: "___",
        construction: "流し, 呼ぶ, 走る",
        translationEn: "Call a carriage",
        readings: {},
        images: [],
        synonymsJa: [],
      }),
    ).toMatch(/2 gaps/)
  })
})

describe("normalizeGrammarContent", () => {
  it("canonicalizes a Japanese-comma-separated construction to ASCII commas", () => {
    expect(
      normalizeGrammarContent({
        sentenceWithGap: "___を___",
        gapMarker: "___",
        construction: "流し、呼ぶ",
        translationEn: "Call a carriage",
        readings: {},
        images: [],
        synonymsJa: [],
      }).construction,
    ).toBe("流し, 呼ぶ")
  })

  it("leaves a single-answer construction unchanged", () => {
    expect(
      normalizeGrammarContent({
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "I am ~",
        readings: {},
        images: [],
        synonymsJa: [],
      }).construction,
    ).toBe("学生")
  })

  it("does not touch a single-gap construction containing 、 as ordinary punctuation", () => {
    // e.g. the "〜たり、〜たり" construction is one answer for one gap, not
    // two comma-separated answers for two gaps.
    expect(
      normalizeGrammarContent({
        sentenceWithGap: "休日は___する",
        gapMarker: "___",
        construction: "食べたり、飲んだり",
        translationEn: "eating and drinking, among other things",
        readings: {},
        images: [],
        synonymsJa: [],
      }).construction,
    ).toBe("食べたり、飲んだり")
  })
})

describe("card type conversions", () => {
  it("converts grammar content to vocabulary content", () => {
    expect(
      vocabularyFromGrammarContent({
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        constructionReading: "がくせい",
        translationEn: "student",
        readings: { 学生: "がくせい" },
        images: ["image-1"],
        synonymsJa: ["生徒"],
      }),
    ).toEqual({
      wordJa: "学生",
      reading: "がくせい",
      readingParts: {},
      readings: { 学生: "がくせい" },
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
      constructionReading: "ねこ",
      constructionReadingParts: {},
      translationEn: "cat; feline",
      readings: {},
      images: ["image-1"],
      synonymsJa: ["ネコ"],
    })
  })

  it("preserves an explicit per-word reading override when converting to grammar", () => {
    expect(
      grammarFromVocabularyContent({
        wordJa: "猫",
        reading: "ねこ",
        readings: { 猫: "みょう" },
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      }).readings,
    ).toEqual({ 猫: "みょう" })
  })
})

describe("mergeCardContent", () => {
  it("concatenates vocabulary fields, keeping the target's word", () => {
    const target: Card = {
      id: "a",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: ["img-a"],
        exampleSentences: ["猫がいます"],
        synonymsJa: [],
      },
      updatedAt: 0,
    }
    const source: Card = {
      id: "b",
      deckId: "deck-2",
      kind: "vocabulary",
      content: {
        wordJa: "猫",
        reading: "",
        definitionsEn: ["feline"],
        images: ["img-b"],
        exampleSentences: [],
        synonymsJa: ["ネコ"],
      },
      updatedAt: 0,
    }

    const merged = mergeCardContent(target, source)
    expect(merged.kind).toBe("vocabulary")
    expect(merged.content).toEqual({
      wordJa: "猫",
      reading: "ねこ",
      readingParts: {},
      readings: {},
      definitionsEn: ["cat", "feline"],
      images: ["img-a", "img-b"],
      exampleSentences: ["猫がいます"],
      synonymsJa: ["ネコ"],
    })
  })

  it("converts a grammar source into vocabulary before merging", () => {
    const target: Card = {
      id: "a",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        wordJa: "学生",
        definitionsEn: ["student"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      updatedAt: 0,
    }
    const source: Card = {
      id: "b",
      deckId: "deck-2",
      kind: "grammar",
      content: {
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "I am a student",
        readings: {},
        images: [],
        synonymsJa: [],
      },
      updatedAt: 0,
    }

    const merged = mergeCardContent(target, source)
    expect(merged.kind).toBe("vocabulary")
    if (merged.kind !== "vocabulary") throw new Error("expected vocabulary")
    expect(merged.content.definitionsEn).toEqual([
      "student",
      "I am a student",
    ])
    expect(merged.content.exampleSentences).toEqual(["私は___です"])
  })

  it("merges overlapping vocabulary example-sentence readings by concatenating", () => {
    const target: Card = {
      id: "a",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        wordJa: "猫",
        definitionsEn: ["cat"],
        readings: { 大好き: "だいすき" },
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      updatedAt: 0,
    }
    const source: Card = {
      id: "b",
      deckId: "deck-2",
      kind: "vocabulary",
      content: {
        wordJa: "猫",
        definitionsEn: [],
        readings: { 大好き: "だいすき!", 元気: "げんき" },
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      updatedAt: 0,
    }

    const merged = mergeCardContent(target, source)
    if (merged.kind !== "vocabulary") throw new Error("expected vocabulary")
    expect(merged.content.readings).toEqual({
      大好き: "だいすき; だいすき!",
      元気: "げんき",
    })
  })

  it("merges overlapping grammar readings by concatenating", () => {
    const target: Card = {
      id: "a",
      deckId: "deck-1",
      kind: "grammar",
      content: {
        sentenceWithGap: "___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "student",
        readings: { 学生: "がくせい" },
        images: [],
        synonymsJa: [],
      },
      updatedAt: 0,
    }
    const source: Card = {
      id: "b",
      deckId: "deck-2",
      kind: "grammar",
      content: {
        sentenceWithGap: "",
        gapMarker: "___",
        construction: "",
        translationEn: "",
        readings: { 学生: "がくせいさん" },
        images: [],
        synonymsJa: [],
      },
      updatedAt: 0,
    }

    const merged = mergeCardContent(target, source)
    if (merged.kind !== "grammar") throw new Error("expected grammar")
    expect(merged.content.readings).toEqual({
      学生: "がくせい; がくせいさん",
    })
  })
})

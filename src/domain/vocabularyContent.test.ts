import { describe, expect, it } from "vitest"
import {
  hasVocabularyEnglishDefinition,
  hasVocabularyPronunciation,
  phraseReadingSegments,
  PLACEHOLDER_DEFINITION,
  wordJaReading,
} from "./vocabularyContent"
import type { VocabularyCardContent } from "./types"

const base: VocabularyCardContent = {
  wordJa: "陣",
  definitionsEn: [],
  images: [],
  exampleSentences: [],
  synonymsJa: [],
}

describe("vocabularyContent helpers", () => {
  it("treats placeholder as non-English", () => {
    expect(
      hasVocabularyEnglishDefinition({
        ...base,
        definitionsEn: [PLACEHOLDER_DEFINITION],
      }),
    ).toBe(false)
  })

  it("detects pronunciation for kanji + reading", () => {
    expect(hasVocabularyPronunciation({ ...base, reading: "じん" })).toBe(true)
    expect(hasVocabularyPronunciation({ ...base, wordJa: "ねこ" })).toBe(false)
  })

  it("detects pronunciation for a phrase word with 2+ reading parts", () => {
    expect(
      hasVocabularyPronunciation({
        ...base,
        wordJa: "結論に至る",
        readingParts: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toBe(true)
  })

  it("does not detect pronunciation from a single reading part — that's what the reading field is for", () => {
    expect(
      hasVocabularyPronunciation({
        ...base,
        wordJa: "陣",
        readingParts: { 陣: "じん" },
      }),
    ).toBe(false)
  })
})

describe("phraseReadingSegments", () => {
  it("returns ordered segments from readingParts", () => {
    expect(
      phraseReadingSegments({
        ...base,
        wordJa: "結論に至る",
        readingParts: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "至る", reading: "いたる" },
    ])
  })

  it("tests a dictionary-form reading independent of the literal word", () => {
    // The label doesn't need to be a literal substring of wordJa — it's
    // freely authored, so a conjugated word can test a different form.
    expect(
      phraseReadingSegments({
        ...base,
        wordJa: "芳しく",
        readingParts: { 芳しい: "かんばしい", もう一つ: "もうひとつ" },
      }),
    ).toEqual([
      { text: "芳しい", reading: "かんばしい" },
      { text: "もう一つ", reading: "もうひとつ" },
    ])
  })

  it("defers to the explicit reading field when set, even with readingParts present", () => {
    expect(
      phraseReadingSegments({
        ...base,
        wordJa: "陣",
        reading: "じん",
        readingParts: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toBeUndefined()
  })

  it("is undefined with no reading parts", () => {
    expect(phraseReadingSegments(base)).toBeUndefined()
  })

  it("is undefined for a single reading part", () => {
    expect(
      phraseReadingSegments({ ...base, readingParts: { 陣: "じん" } }),
    ).toBeUndefined()
  })
})

describe("wordJaReading", () => {
  it("returns the explicit reading field when set", () => {
    expect(wordJaReading({ ...base, wordJa: "陣", reading: "じん" })).toBe("じん")
  })

  it("concatenates phrase segments into one flat reading when there's no reading field", () => {
    expect(
      wordJaReading({
        ...base,
        wordJa: "結論に至る",
        readingParts: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toBe("けつろんにいたる")
  })

  it("is undefined when neither a reading field nor 2+ reading parts are available", () => {
    expect(wordJaReading(base)).toBeUndefined()
  })
})

import { describe, expect, it } from "vitest"
import {
  hasVocabularyEnglishDefinition,
  hasVocabularyPronunciation,
  phraseReadingSegments,
  PLACEHOLDER_DEFINITION,
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

  it("detects pronunciation for a phrase word covered by the readings map", () => {
    expect(
      hasVocabularyPronunciation({
        ...base,
        wordJa: "結論に至る",
        readings: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toBe(true)
  })

  it("does not detect pronunciation when the readings map only partially covers a phrase word", () => {
    expect(
      hasVocabularyPronunciation({
        ...base,
        wordJa: "結論に至る",
        readings: { 結論: "けつろん" },
      }),
    ).toBe(false)
  })
})

describe("phraseReadingSegments", () => {
  it("splits a phrase word into ordered kanji-cluster segments", () => {
    expect(
      phraseReadingSegments({
        ...base,
        wordJa: "結論に至る",
        readings: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "に" },
      { text: "至る", reading: "いたる" },
    ])
  })

  it("defers to the explicit reading field for a plain single-reading word", () => {
    expect(
      phraseReadingSegments({ ...base, wordJa: "陣", reading: "じん" }),
    ).toBeUndefined()
  })

  it("is undefined for a kana-only word", () => {
    expect(phraseReadingSegments({ ...base, wordJa: "ねこ" })).toBeUndefined()
  })

  it("is undefined when the map does not cover every kanji character", () => {
    expect(
      phraseReadingSegments({
        ...base,
        wordJa: "結論に至る",
        readings: { 結論: "けつろん" },
      }),
    ).toBeUndefined()
  })
})

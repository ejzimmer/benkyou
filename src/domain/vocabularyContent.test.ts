import { describe, expect, it } from "vitest"
import {
  hasVocabularyEnglishDefinition,
  hasVocabularyPronunciation,
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
})

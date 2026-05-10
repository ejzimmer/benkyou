import { describe, expect, it } from "vitest"
import {
  isSynonymAnswer,
  matchesPrimaryJapanese,
} from "./synonyms"
import type { Card } from "../../domain/types"

const vocabCard = (): Card => ({
  id: "c1",
  deckId: "d1",
  kind: "vocabulary",
  updatedAt: 1,
  content: {
    wordJa: "寿司",
    reading: "すし",
    definitionsEn: ["sushi"],
    images: [],
    exampleSentences: [],
    synonymsJa: ["鮨", "すし屋"],
  },
})

const grammarCard = (): Card => ({
  id: "c2",
  deckId: "d1",
  kind: "grammar",
  updatedAt: 1,
  content: {
    sentenceWithGap: "___です",
    gapMarker: "___",
    construction: "学生",
    translationEn: "student context",
    readings: {},
    images: [],
    synonymsJa: ["生徒"],
  },
})

describe("isSynonymAnswer", () => {
  it("matches listed synonym for vocabulary", () => {
    expect(isSynonymAnswer(vocabCard(), "鮨")).toBe(true)
  })
  it("does not match unrelated text", () => {
    expect(isSynonymAnswer(vocabCard(), "天ぷら")).toBe(false)
  })
  it("matches grammar synonym", () => {
    expect(isSynonymAnswer(grammarCard(), "生徒")).toBe(true)
  })
})

describe("matchesPrimaryJapanese", () => {
  it("matches headword", () => {
    expect(matchesPrimaryJapanese(vocabCard(), "寿司")).toBe(true)
  })
  it("matches canonical reading", () => {
    expect(matchesPrimaryJapanese(vocabCard(), "すし")).toBe(true)
  })
  it("matches grammar construction", () => {
    expect(matchesPrimaryJapanese(grammarCard(), "学生")).toBe(true)
  })
})

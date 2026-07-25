import { describe, expect, it } from "vitest"
import { matchesPrimaryJapanese } from "./primaryAnswer"
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
  },
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

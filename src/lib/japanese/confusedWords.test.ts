import { describe, expect, it } from "vitest"
import { matchesConfusedWord } from "./confusedWords"
import type { Card } from "../../domain/types"

const vocabCard = (confusedWith?: string[]): Card => ({
  id: "c1",
  deckId: "d1",
  kind: "vocabulary",
  updatedAt: 1,
  content: {
    wordJa: "細い",
    reading: "ほそい",
    definitionsEn: ["thin"],
    images: [],
    exampleSentences: [],
    confusedWith,
  },
})

describe("matchesConfusedWord", () => {
  it("matches a flagged confusable word", () => {
    expect(matchesConfusedWord(vocabCard(["痩せる"]), "痩せる")).toBe("痩せる")
  })
  it("normalizes before comparing (whitespace/width)", () => {
    expect(matchesConfusedWord(vocabCard(["痩せる"]), " 痩せる ")).toBe("痩せる")
  })
  it("returns undefined when typed doesn't match any flagged word", () => {
    expect(matchesConfusedWord(vocabCard(["痩せる"]), "太い")).toBeUndefined()
  })
  it("returns undefined when nothing was typed", () => {
    expect(matchesConfusedWord(vocabCard(["痩せる"]), "")).toBeUndefined()
  })
  it("returns undefined when the card has no confusedWith list", () => {
    expect(matchesConfusedWord(vocabCard(undefined), "痩せる")).toBeUndefined()
  })
})

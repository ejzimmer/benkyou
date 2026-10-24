import { describe, expect, it } from "vitest"
import { cardMatchesQuery } from "./cardSearch"
import type { Card } from "./types"

const vocab: Card = {
  id: "v",
  deckId: "d",
  kind: "vocabulary",
  updatedAt: 0,
  content: {
    wordJa: "猫",
    reading: "ねこ",
    definitionsEn: ["Cat"],
    images: [],
    exampleSentences: ["庭に猫がいる"],
  },
} as Card

const grammar: Card = {
  id: "g",
  deckId: "d",
  kind: "grammar",
  updatedAt: 0,
  content: {
    sentenceWithGap: "雨が降っている___、出かけた。",
    gapMarker: "___",
    construction: "のに",
    constructionReading: "のに",
    translationEn: "Even though",
    readings: { 雨: "あめ" },
    images: [],
  },
} as Card

describe("cardMatchesQuery", () => {
  it.each([
    ["the Japanese word", "猫"],
    ["the answer, case-insensitively", "cat"],
    ["the hiragana reading", "ねこ"],
    ["an example sentence", "庭"],
  ])("matches a vocabulary card by %s", (_, q) => {
    expect(cardMatchesQuery(vocab, q)).toBe(true)
  })

  it.each([
    ["the question sentence", "出かけた"],
    ["the answer", "のに"],
    ["a furigana reading", "あめ"],
    ["the translation", "even"],
  ])("matches a grammar card by %s", (_, q) => {
    expect(cardMatchesQuery(grammar, q)).toBe(true)
  })

  it("doesn't match unrelated text", () => {
    expect(cardMatchesQuery(vocab, "犬")).toBe(false)
  })
})

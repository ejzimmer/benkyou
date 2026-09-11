import { describe, expect, it } from "vitest"
import {
  findDismissedDuplicateCards,
  findDuplicateCards,
  isMarkedNotDuplicate,
} from "./duplicates"
import type { Card } from "./types"
import { defaultGrammar, defaultVocabulary } from "../services/cards"

function vocab(id: string, deckId: string, overrides = {}): Card {
  return {
    id,
    deckId,
    kind: "vocabulary",
    content: { ...defaultVocabulary(), ...overrides },
    updatedAt: Date.now(),
  }
}

function grammar(id: string, deckId: string, overrides = {}): Card {
  return {
    id,
    deckId,
    kind: "grammar",
    content: { ...defaultGrammar(), ...overrides },
    updatedAt: Date.now(),
  }
}

describe("findDuplicateCards", () => {
  it("matches when the word appears in another card's definitions", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    const other = vocab("b", "deck-1", {
      wordJa: "動物",
      definitionsEn: ["a 猫 is a kind of animal"],
    })
    expect(findDuplicateCards(target, [target, other])).toEqual([other])
  })

  it("matches when the word appears in an example sentence", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    const bySentence = vocab("b", "deck-1", {
      exampleSentences: ["猫がいます"],
    })
    expect(findDuplicateCards(target, [target, bySentence])).toEqual([bySentence])
  })

  it("matches against grammar card fields, including readings", () => {
    const target = vocab("a", "deck-1", { wordJa: "学生" })
    const match = grammar("b", "deck-1", {
      construction: "元",
      translationEn: "student stuff",
      readings: { 元: "学生時代" },
    })
    expect(findDuplicateCards(target, [target, match])).toEqual([match])
  })

  it("does not match itself", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    expect(findDuplicateCards(target, [target])).toEqual([])
  })

  it("returns nothing for an empty Japanese word", () => {
    const target = vocab("a", "deck-1", { wordJa: "" })
    const other = vocab("b", "deck-1", { definitionsEn: [""] })
    expect(findDuplicateCards(target, [target, other])).toEqual([])
  })

  it("does not match unrelated cards", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    const other = vocab("b", "deck-1", { wordJa: "犬", definitionsEn: ["dog"] })
    expect(findDuplicateCards(target, [target, other])).toEqual([])
  })
})

describe("cards marked as not duplicates", () => {
  it("drops a match the card has marked as not a duplicate", () => {
    const other = vocab("b", "deck-1", { wordJa: "子猫", definitionsEn: ["kitten"] })
    const target: Card = { ...vocab("a", "deck-1", { wordJa: "猫" }), notDuplicateOf: ["b"] }

    expect(findDuplicateCards(target, [target, other])).toEqual([])
    expect(findDismissedDuplicateCards(target, [target, other])).toEqual([other])
  })

  it("honours the mark from whichever side of the pair still carries it", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    const other: Card = {
      ...vocab("b", "deck-1", { wordJa: "子猫", definitionsEn: ["kitten"] }),
      notDuplicateOf: ["a"],
    }

    expect(isMarkedNotDuplicate(target, other)).toBe(true)
    expect(findDuplicateCards(target, [target, other])).toEqual([])
    expect(findDuplicateCards(other, [target, other])).toEqual([])
  })

  it("leaves other matches alone", () => {
    const dismissed = vocab("b", "deck-1", { wordJa: "子猫", definitionsEn: ["kitten"] })
    const stillMatching = vocab("c", "deck-1", { wordJa: "猫舌", definitionsEn: ["cat tongue"] })
    const target: Card = { ...vocab("a", "deck-1", { wordJa: "猫" }), notDuplicateOf: ["b"] }

    expect(findDuplicateCards(target, [target, dismissed, stillMatching])).toEqual([
      stillMatching,
    ])
  })

  it("never reports a dismissed card that no longer matches at all", () => {
    const unrelated: Card = {
      ...vocab("b", "deck-1", { wordJa: "犬", definitionsEn: ["dog"] }),
      notDuplicateOf: ["a"],
    }
    const target: Card = { ...vocab("a", "deck-1", { wordJa: "猫" }), notDuplicateOf: ["b"] }

    expect(findDismissedDuplicateCards(target, [target, unrelated])).toEqual([])
  })
})

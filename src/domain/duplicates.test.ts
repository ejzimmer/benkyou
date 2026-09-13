import { describe, expect, it } from "vitest"
import { isMarkedNotDuplicate, partitionDuplicateCards } from "./duplicates"
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

describe("partitionDuplicateCards", () => {
  it("matches another card teaching the same word", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫", definitionsEn: ["cat"] })
    const other = vocab("b", "deck-1", { wordJa: "猫", definitionsEn: ["a cat"] })
    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([other])
  })

  it("matches a phrase built on the same word", () => {
    const target = vocab("a", "deck-1", { wordJa: "結論" })
    const phrase = vocab("b", "deck-1", { wordJa: "結論に至る" })
    expect(partitionDuplicateCards(target, [target, phrase]).matches).toEqual([phrase])
  })

  it("matches a kana card against the same word's reading", () => {
    const target = vocab("a", "deck-1", { wordJa: "ひんぱん" })
    const kanji = vocab("b", "deck-1", { wordJa: "頻繁", reading: "ひんぱん" })
    expect(partitionDuplicateCards(target, [target, kanji]).matches).toEqual([kanji])
  })

  it("matches a fill-in-the-gap card whose answer is the same word", () => {
    const target = vocab("a", "deck-1", { wordJa: "交換" })
    const match = grammar("b", "deck-1", {
      construction: "交換",
      sentenceWithGap: "ペン先は頻繁に___する",
    })
    expect(partitionDuplicateCards(target, [target, match]).matches).toEqual([match])
  })

  it("ignores a word that only appears in another card's example sentence", () => {
    const target = vocab("a", "deck-1", { wordJa: "交換", definitionsEn: ["exchange"] })
    const other = vocab("b", "deck-1", {
      wordJa: "頻繁",
      definitionsEn: ["frequent"],
      exampleSentences: ["磨墨をつけて使うペン先は＿＿に交換する"],
    })
    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([])
  })

  it("ignores a word that only appears in a gap sentence or its furigana", () => {
    const target = vocab("a", "deck-1", { wordJa: "頻繁", definitionsEn: ["frequent"] })
    const other = grammar("b", "deck-1", {
      construction: "交換",
      sentenceWithGap: "磨墨をつけて使うペン先は頻繁に___する",
      translationEn: "replace the nib frequently",
      readings: { 頻繁: "ひんぱん", 交換: "こうかん" },
    })
    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([])
  })

  // The pair that prompted narrowing the search: two unrelated words that a
  // single example sentence happens to use together, flagged for each other
  // in both directions because each appeared in the other's sentence (and,
  // for good measure, in its furigana map).
  it("ignores two words that only share a sentence", () => {
    const hinpan = vocab("a", "deck-1", {
      wordJa: "頻繁",
      reading: "ひんぱん",
      definitionsEn: ["frequent"],
      exampleSentences: ["磨墨をつけて使うペン先は＿＿に交換する"],
      readings: { 磨墨: "まずみ", 交換: "こうかん" },
    })
    const koukan = grammar("b", "deck-1", {
      sentenceWithGap: "磨墨をつけて使うペン先は頻繁に___する",
      construction: "交換",
      constructionReading: "こうかん",
      translationEn: "exchange",
      readings: { 磨墨: "まずみ", 頻繁: "ひんぱん" },
    })

    expect(partitionDuplicateCards(hinpan, [hinpan, koukan]).matches).toEqual([])
    expect(partitionDuplicateCards(koukan, [hinpan, koukan]).matches).toEqual([])
  })

  it("ignores a word that only appears inside an English definition", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    const other = vocab("b", "deck-1", {
      wordJa: "動物",
      definitionsEn: ["a 猫 is a kind of animal"],
    })
    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([])
  })

  it("does not match itself", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    expect(partitionDuplicateCards(target, [target]).matches).toEqual([])
  })

  it("returns nothing for an empty Japanese word", () => {
    const target = vocab("a", "deck-1", { wordJa: "" })
    const other = vocab("b", "deck-1", { definitionsEn: [""] })
    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([])
  })

  it("does not match unrelated cards", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    const other = vocab("b", "deck-1", { wordJa: "犬", definitionsEn: ["dog"] })
    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([])
  })
})

describe("cards marked as not duplicates", () => {
  it("drops a match the card has marked as not a duplicate", () => {
    const other = vocab("b", "deck-1", { wordJa: "子猫", definitionsEn: ["kitten"] })
    const target: Card = { ...vocab("a", "deck-1", { wordJa: "猫" }), notDuplicateOf: ["b"] }

    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([])
    expect(partitionDuplicateCards(target, [target, other]).dismissed).toEqual([other])
  })

  it("honours the mark from whichever side of the pair still carries it", () => {
    const target = vocab("a", "deck-1", { wordJa: "猫" })
    const other: Card = {
      ...vocab("b", "deck-1", { wordJa: "子猫", definitionsEn: ["kitten"] }),
      notDuplicateOf: ["a"],
    }

    expect(isMarkedNotDuplicate(target, other)).toBe(true)
    expect(partitionDuplicateCards(target, [target, other]).matches).toEqual([])
    expect(partitionDuplicateCards(other, [target, other]).matches).toEqual([])
  })

  it("leaves other matches alone", () => {
    const dismissed = vocab("b", "deck-1", { wordJa: "子猫", definitionsEn: ["kitten"] })
    const stillMatching = vocab("c", "deck-1", { wordJa: "猫舌", definitionsEn: ["cat tongue"] })
    const target: Card = { ...vocab("a", "deck-1", { wordJa: "猫" }), notDuplicateOf: ["b"] }

    expect(partitionDuplicateCards(target, [target, dismissed, stillMatching]).matches).toEqual([
      stillMatching,
    ])
  })

  it("never reports a dismissed card that no longer matches at all", () => {
    const unrelated: Card = {
      ...vocab("b", "deck-1", { wordJa: "犬", definitionsEn: ["dog"] }),
      notDuplicateOf: ["a"],
    }
    const target: Card = { ...vocab("a", "deck-1", { wordJa: "猫" }), notDuplicateOf: ["b"] }

    expect(partitionDuplicateCards(target, [target, unrelated]).dismissed).toEqual([])
  })
})

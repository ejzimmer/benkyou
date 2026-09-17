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

  it("matches a reading authored only as headword furigana", () => {
    // No `reading` field — the reading lives in the furigana map, which is
    // the shape a card gets when its reading was only ever authored there.
    const target = vocab("a", "deck-1", { wordJa: "ひんぱん" })
    const kanji = vocab("b", "deck-1", {
      wordJa: "頻繁",
      readings: { 頻繁: "ひんぱん" },
    })
    expect(partitionDuplicateCards(target, [target, kanji]).matches).toEqual([kanji])
  })

  it("matches headword furigana authored one kanji per line", () => {
    // The shape `addMissingKanjiLines` seeds the editor with: a line per
    // kanji, so the whole-word reading only exists once they're joined.
    const target = vocab("a", "deck-1", { wordJa: "ひんぱん" })
    const kanji = vocab("b", "deck-1", {
      wordJa: "頻繁",
      readings: { 頻: "ひん", 繁: "ぱん" },
    })
    expect(partitionDuplicateCards(target, [target, kanji]).matches).toEqual([kanji])
  })

  it("matches a reading split across readingParts", () => {
    const target = vocab("a", "deck-1", { wordJa: "けつろんにいたる" })
    const parts = vocab("b", "deck-1", {
      wordJa: "結論に至る",
      readingParts: { 結論: "けつろん", 至る: "いたる" },
    })
    expect(partitionDuplicateCards(target, [target, parts]).matches).toEqual([parts])
  })

  it("carries un-annotated okurigana into the headword reading", () => {
    // 至る=いたる is authored narrowed to the kanji (至=いた), per the
    // furigana field's own convention.
    const target = vocab("a", "deck-1", { wordJa: "いたる" })
    const kanji = vocab("b", "deck-1", { wordJa: "至る", readings: { 至: "いた" } })
    expect(partitionDuplicateCards(target, [target, kanji]).matches).toEqual([kanji])
  })

  it("builds no reading from a furigana map that leaves a headword kanji unread", () => {
    // 人=ひと is an example-sentence entry; 大 has no reading, so there is no
    // whole-word reading here — and 大人 must not become おおひと or ひと.
    const target = vocab("a", "deck-1", { wordJa: "ひと" })
    const otona = vocab("b", "deck-1", { wordJa: "大人", readings: { 人: "ひと" } })
    expect(partitionDuplicateCards(target, [target, otona]).matches).toEqual([])
  })

  it("reports a pair from whichever side is being reviewed", () => {
    const word = vocab("a", "deck-1", { wordJa: "結論" })
    const phrase = vocab("b", "deck-1", { wordJa: "結論に至る" })

    // "These might be the same word" is symmetric, and so is the dismissal
    // that answers it, so neither direction may go silent.
    expect(partitionDuplicateCards(word, [word, phrase]).matches).toEqual([phrase])
    expect(partitionDuplicateCards(phrase, [word, phrase]).matches).toEqual([word])
  })

  it("matches a fill-in-the-gap card whose answer is the same word", () => {
    const target = vocab("a", "deck-1", { wordJa: "交換" })
    const match = grammar("b", "deck-1", {
      construction: "交換",
      sentenceWithGap: "ペン先は頻繁に___する",
    })
    expect(partitionDuplicateCards(target, [target, match]).matches).toEqual([match])
  })

  it("ignores a reading that merely contains a short construction", () => {
    // A two-kana grammar point would otherwise sweep up half the deck on
    // syllable coincidence alone — these words have nothing to do with こと.
    const koto = grammar("a", "deck-1", {
      construction: "こと",
      constructionReading: "こと",
      sentenceWithGap: "泳ぐ___ができる",
    })
    const kotonaru = vocab("b", "deck-1", { wordJa: "異なる", reading: "ことなる" })
    const makoto = vocab("c", "deck-1", { wordJa: "誠", reading: "まこと" })

    expect(partitionDuplicateCards(koto, [koto, kotonaru, makoto]).matches).toEqual([])
    expect(partitionDuplicateCards(kotonaru, [koto, kotonaru, makoto]).matches).toEqual([])
    expect(partitionDuplicateCards(makoto, [koto, kotonaru, makoto]).matches).toEqual([])
  })

  it("matches two cards for the same kana-only word", () => {
    const koto = grammar("a", "deck-1", { construction: "こと" })
    const alsoKoto = grammar("b", "deck-1", { construction: "こと", translationEn: "nominalizer" })
    expect(partitionDuplicateCards(koto, [koto, alsoKoto]).matches).toEqual([alsoKoto])
  })

  it("does not match a short katakana word inside a longer one", () => {
    // Katakana is kana: a short loanword lands inside unrelated longer ones
    // just as ことわざ swallows こと.
    const pan = vocab("a", "deck-1", { wordJa: "パン", definitionsEn: ["bread"] })
    const panda = vocab("b", "deck-1", { wordJa: "パンダ", definitionsEn: ["panda"] })
    const japan = vocab("c", "deck-1", { wordJa: "ジャパン", definitionsEn: ["Japan"] })
    const all = [pan, panda, japan]

    expect(partitionDuplicateCards(pan, all).matches).toEqual([])
    expect(partitionDuplicateCards(panda, all).matches).toEqual([])
    expect(partitionDuplicateCards(japan, all).matches).toEqual([])
  })

  it("matches two cards for the same katakana word", () => {
    const pen = vocab("a", "deck-1", { wordJa: "ペン", definitionsEn: ["pen"] })
    const alsoPen = vocab("b", "deck-1", { wordJa: "ペン", definitionsEn: ["a pen"] })
    expect(partitionDuplicateCards(pen, [pen, alsoPen]).matches).toEqual([alsoPen])
  })

  it("does not match a kana-only headword inside a longer word", () => {
    // Kana are syllables, so a one- or two-kana construction turns up
    // inside unrelated words constantly. Only a headword with kanji in it
    // may match as a substring.
    const koto = grammar("a", "deck-1", { construction: "こと" })
    const ni = grammar("b", "deck-1", { construction: "に" })
    const kotowaza = vocab("c", "deck-1", { wordJa: "ことわざ" })
    const ninjin = vocab("d", "deck-1", { wordJa: "にんじん" })
    const itaru = vocab("e", "deck-1", { wordJa: "結論に至る" })
    const all = [koto, ni, kotowaza, ninjin, itaru]

    expect(partitionDuplicateCards(koto, all).matches).toEqual([])
    expect(partitionDuplicateCards(ni, all).matches).toEqual([])
    expect(partitionDuplicateCards(kotowaza, all).matches).toEqual([])
    expect(partitionDuplicateCards(ninjin, all).matches).toEqual([])
    expect(partitionDuplicateCards(itaru, all).matches).toEqual([])
  })

  it("does not read a headword reading out of a map shared with a sentence", () => {
    // No `reading` of its own, but the furigana map also annotates the
    // example sentence — so {一: いち, 日: にち} may be the sentence's
    // reading of 一日, not this card's. Deriving いちにち from it would
    // match a card for a word this one may not teach at all.
    const tsuitachi = vocab("a", "deck-1", {
      wordJa: "一日",
      readings: { 一: "いち", 日: "にち" },
      exampleSentences: ["一日中ねていた"],
      definitionsEn: ["the first of the month"],
    })
    const ichinichi = vocab("b", "deck-1", { wordJa: "いちにち" })
    expect(partitionDuplicateCards(tsuitachi, [tsuitachi, ichinichi]).matches).toEqual([])
    expect(partitionDuplicateCards(ichinichi, [tsuitachi, ichinichi]).matches).toEqual([])
  })

  it("does not invent a reading from the furigana map when the card has its own", () => {
    // 一日 is read ついたち here; {一: いち, 日: にち} are sentence entries.
    // Deriving いちにち from them would match a word this card never teaches.
    const tsuitachi = vocab("a", "deck-1", {
      wordJa: "一日",
      reading: "ついたち",
      readings: { 一: "いち", 日: "にち" },
    })
    const ichinichi = vocab("b", "deck-1", { wordJa: "いちにち" })
    expect(partitionDuplicateCards(tsuitachi, [tsuitachi, ichinichi]).matches).toEqual([])
    expect(partitionDuplicateCards(ichinichi, [tsuitachi, ichinichi]).matches).toEqual([])
  })

  it("still matches the card's own reading when it has one", () => {
    const tsuitachi = vocab("a", "deck-1", {
      wordJa: "一日",
      reading: "ついたち",
      readings: { 一: "いち", 日: "にち" },
    })
    const kana = vocab("b", "deck-1", { wordJa: "ついたち" })
    expect(partitionDuplicateCards(kana, [tsuitachi, kana]).matches).toEqual([tsuitachi])
  })

  it("reads a gap card's construction reading from its own fields, not the sentence furigana", () => {
    // A gap card always has a sentence, so its furigana map is always a
    // mixture of the two — same rule as a vocabulary card with examples.
    const fromParts = grammar("a", "deck-1", {
      construction: "頻繁",
      constructionReadingParts: { 頻繁: "ひんぱん" },
      sentenceWithGap: "ペン先は___に交換する",
      readings: { 先: "さき", 交換: "こうかん" },
    })
    const kana = vocab("b", "deck-1", { wordJa: "ひんぱん" })
    expect(partitionDuplicateCards(kana, [fromParts, kana]).matches).toEqual([fromParts])

    const fromSentenceFurigana = grammar("c", "deck-1", {
      construction: "一日",
      sentenceWithGap: "___中ねていた",
      readings: { 一: "いち", 日: "にち" },
    })
    const ichinichi = vocab("d", "deck-1", { wordJa: "いちにち" })
    expect(
      partitionDuplicateCards(ichinichi, [fromSentenceFurigana, ichinichi]).matches,
    ).toEqual([])
  })

  it("ignores homophones written with different kanji", () => {
    // Same reading, different word — a shared reading only identifies a
    // duplicate when it's the *headword* of the other card.
    const hashi = vocab("a", "deck-1", { wordJa: "橋", reading: "はし" })
    const chopsticks = vocab("b", "deck-1", { wordJa: "箸", reading: "はし" })
    expect(partitionDuplicateCards(hashi, [hashi, chopsticks]).matches).toEqual([])
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

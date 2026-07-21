import { describe, expect, it } from "vitest"
import {
  finalizeReadingAnswer,
  hasKanjiOrKatakana,
  hasNonHiraganaKana,
  isMissingDoubledN,
  normalizeJapanese,
} from "./normalize"

describe("normalizeJapanese", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeJapanese("  a  b  ")).toBe("a b")
  })
  it("NFKC normalizes compatibility forms", () => {
    expect(normalizeJapanese("\uFF11")).toBe("1")
  })
})

describe("hasKanjiOrKatakana", () => {
  it("detects kanji", () => {
    expect(hasKanjiOrKatakana("食べる")).toBe(true)
  })
  it("detects katakana block", () => {
    expect(hasKanjiOrKatakana("ソ")).toBe(true)
  })
  it("returns false for hiragana only", () => {
    expect(hasKanjiOrKatakana("たべる")).toBe(false)
  })
})

describe("hasNonHiraganaKana", () => {
  it("allows plain hiragana", () => {
    expect(hasNonHiraganaKana("すし")).toBe(false)
  })
  it("flags kanji in reading field", () => {
    expect(hasNonHiraganaKana("寿司")).toBe(true)
  })
  it("flags katakana", () => {
    expect(hasNonHiraganaKana("スシ")).toBe(true)
  })
})

describe("finalizeReadingAnswer", () => {
  it("converts a trailing half-width romaji n to ん", () => {
    expect(finalizeReadingAnswer("もちろn")).toBe("もちろん")
  })
  it("converts a trailing full-width ｎ (as some IMEs emit) to ん", () => {
    expect(finalizeReadingAnswer("もちろｎ")).toBe("もちろん")
  })
  it("handles a trailing upper-case N in either width", () => {
    expect(finalizeReadingAnswer("もちろN")).toBe("もちろん")
    expect(finalizeReadingAnswer("もちろＮ")).toBe("もちろん")
  })
  it("converts a lone trailing n", () => {
    expect(finalizeReadingAnswer("n")).toBe("ん")
    expect(finalizeReadingAnswer("ｎ")).toBe("ん")
  })
  it("leaves an already-correct hiragana reading untouched", () => {
    expect(finalizeReadingAnswer("もちろん")).toBe("もちろん")
    expect(finalizeReadingAnswer("しんぶん")).toBe("しんぶん")
  })
  it("still converts mid-word kana so ん is not the only thing handled", () => {
    expect(finalizeReadingAnswer("しんぶn")).toBe("しんぶん")
  })
  it("converts a dangling n left at the end of an earlier comma-separated segment", () => {
    // toHiragana itself converts the ASCII "," to "、" along the way.
    expect(finalizeReadingAnswer("けつろn, いたる")).toBe("けつろん、 いたる")
    expect(finalizeReadingAnswer("けつろn、いたる")).toBe("けつろん、いたる")
  })
})

describe("isMissingDoubledN", () => {
  it("flags ん swallowed into な行 before a vowel (missed doubled n)", () => {
    // うんえいしゃ typed as "u,n,e,i,sha" (single n) comes out うねいしゃ,
    // not うんえいしゃ, because a lone "n" before "e" reads as "ne".
    expect(isMissingDoubledN("うねいしゃ", "うんえいしゃ")).toBe(true)
  })
  it("flags each vowel row: な/に/ぬ/ね/の swallowing ん+あいうえお", () => {
    expect(isMissingDoubledN("さない", "さんあい")).toBe(true)
    expect(isMissingDoubledN("さにい", "さんいい")).toBe(true)
    expect(isMissingDoubledN("さぬい", "さんうい")).toBe(true)
    expect(isMissingDoubledN("さねい", "さんえい")).toBe(true)
    expect(isMissingDoubledN("さのい", "さんおい")).toBe(true)
  })
  it("flags ん swallowed into にゃ/にゅ/にょ before や行", () => {
    expect(isMissingDoubledN("かにょう", "かんよう")).toBe(true)
    expect(isMissingDoubledN("さにゅう", "さんゆう")).toBe(true)
    expect(isMissingDoubledN("さにゃ", "さんや")).toBe(true)
  })
  it("handles more than one missed doubled n in the same word", () => {
    expect(isMissingDoubledN("さなね", "さんあんえ")).toBe(true)
  })
  it("does not flag an already-correct answer", () => {
    expect(isMissingDoubledN("うんえいしゃ", "うんえいしゃ")).toBe(false)
  })
  it("does not flag ん before a consonant, where there's no ambiguity to begin with", () => {
    expect(isMissingDoubledN("しんぶ", "しんぶん")).toBe(false)
  })
  it("does not flag a wrong answer unrelated to a missed ん", () => {
    expect(isMissingDoubledN("ねこ", "いぬ")).toBe(false)
  })
  it("does not flag an empty answer", () => {
    expect(isMissingDoubledN("", "うんえいしゃ")).toBe(false)
  })
})

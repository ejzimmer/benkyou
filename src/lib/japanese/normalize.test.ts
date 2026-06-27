import { describe, expect, it } from "vitest"
import {
  finalizeReadingAnswer,
  hasKanjiOrKatakana,
  hasNonHiraganaKana,
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
})

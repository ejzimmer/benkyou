import { describe, expect, it } from "vitest"
import {
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

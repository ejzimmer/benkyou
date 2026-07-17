import { describe, expect, it } from "vitest"
import {
  deriveFurigana,
  fullyCoveredSegments,
  kanjiOnlyEntry,
  parseReadingsMapText,
  parseWordReadingText,
  readingsMapToText,
  reseedFurigana,
  segmentText,
  withWordReadingFallback,
  wordReadingToText,
} from "./readingsMap"

describe("readingsMapToText / parseReadingsMapText", () => {
  it("round-trips completed lines", () => {
    const r = { 私: "わたし", 学生: "がくせい" }
    expect(parseReadingsMapText(readingsMapToText(r))).toEqual(r)
  })

  it("parse ignores incomplete lines without equals", () => {
    expect(parseReadingsMapText("私\n私=")).toEqual({ 私: "" })
  })

  it("also splits on a fullwidth ＝", () => {
    expect(parseReadingsMapText("私＝わたし")).toEqual({ 私: "わたし" })
  })
})

describe("parseWordReadingText / wordReadingToText", () => {
  it("treats text with no separator as a single whole-word reading", () => {
    expect(parseWordReadingText("ねこ")).toEqual({
      reading: "ねこ",
      readingParts: {},
    })
  })

  it("treats blank text as no reading at all", () => {
    expect(parseWordReadingText("  ")).toEqual({
      reading: undefined,
      readingParts: {},
    })
  })

  it("splits into per-cluster readings once = appears anywhere", () => {
    expect(parseWordReadingText("結論=けつろん\n至る=いたる")).toEqual({
      reading: undefined,
      readingParts: { 結論: "けつろん", 至る: "いたる" },
    })
  })

  it("also treats a fullwidth ＝ as splitting into per-cluster readings", () => {
    expect(parseWordReadingText("結論＝けつろん")).toEqual({
      reading: undefined,
      readingParts: { 結論: "けつろん" },
    })
  })

  it("strips an embedded newline from a whole-word reading rather than corrupting it", () => {
    expect(parseWordReadingText("ねこ\nちゃん")).toEqual({
      reading: "ねこちゃん",
      readingParts: {},
    })
  })

  it("round-trips a whole-word reading back to text", () => {
    expect(wordReadingToText("ねこ", {}, "猫")).toBe("ねこ")
  })

  it("round-trips per-cluster readings back to text", () => {
    expect(
      wordReadingToText(undefined, { 結論: "けつろん", 至る: "いたる" }, "結論に至る"),
    ).toBe("結論=けつろん\n至る=いたる")
  })

  it("folds a stale whole-word reading in as its own labeled entry rather than hiding it, when both are set at once (e.g. from a card merge)", () => {
    expect(
      wordReadingToText("けつろんにいたる", { 至る: "いたる" }, "結論に至る"),
    ).toBe("至る=いたる\n結論に至る=けつろんにいたる")
  })
})

describe("withWordReadingFallback", () => {
  it("adds the word's reading when the map has no entry for it", () => {
    expect(withWordReadingFallback({ 学生: "がくせい" }, "猫", "ねこ")).toEqual({
      学生: "がくせい",
      猫: "ねこ",
    })
  })

  it("does not overwrite an existing explicit entry for the word", () => {
    expect(withWordReadingFallback({ 猫: "みょう" }, "猫", "ねこ")).toEqual({
      猫: "みょう",
    })
  })

  it("leaves the map unchanged when there is no fallback reading", () => {
    expect(withWordReadingFallback({ 学生: "がくせい" }, "猫", undefined)).toEqual({
      学生: "がくせい",
    })
  })
})

describe("segmentText", () => {
  it("splits a phrase into matched kanji clusters plus literal hiragana", () => {
    expect(
      segmentText("結論に至る", { 結論: "けつろん", 至る: "いたる" }),
    ).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "に" },
      { text: "至る", reading: "いたる" },
    ])
  })

  it("prefers the longest matching key", () => {
    expect(
      segmentText("大好き", { 大好き: "だいすき", 大: "だい" }),
    ).toEqual([{ text: "大好き", reading: "だいすき" }])
  })

  it("returns unmatched characters one at a time", () => {
    expect(segmentText("猫犬", {})).toEqual([{ text: "猫" }, { text: "犬" }])
  })
})

describe("fullyCoveredSegments", () => {
  it("returns the segments when every kanji character is covered", () => {
    expect(
      fullyCoveredSegments("結論に至る", { 結論: "けつろん", 至る: "いたる" }),
    ).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "に" },
      { text: "至る", reading: "いたる" },
    ])
  })

  it("returns undefined when a kanji cluster is missing from the map", () => {
    expect(
      fullyCoveredSegments("結論に至る", { 結論: "けつろん" }),
    ).toBeUndefined()
  })

  it("returns undefined for an uncovered kanji word with no map entries", () => {
    expect(fullyCoveredSegments("学生", {})).toBeUndefined()
  })
})

describe("kanjiOnlyEntry", () => {
  it("strips a trailing okurigana suffix from both label and reading", () => {
    expect(kanjiOnlyEntry("至る", "いたる")).toEqual({
      label: "至",
      reading: "いた",
    })
  })

  it("leaves a pure kanji run unchanged", () => {
    expect(kanjiOnlyEntry("結論", "けつろん")).toEqual({
      label: "結論",
      reading: "けつろん",
    })
  })

  it("strips a multi-character trailing suffix", () => {
    expect(kanjiOnlyEntry("芳しい", "かんばしい")).toEqual({
      label: "芳",
      reading: "かんば",
    })
  })

  it("leaves a label with no kanji at all unchanged", () => {
    expect(kanjiOnlyEntry("です", "です")).toEqual({
      label: "です",
      reading: "です",
    })
  })

  it("leaves the reading unstripped when it's shorter than the suffix, rather than garbling it", () => {
    // label's non-kanji suffix (5 chars) is longer than the reading (3
    // chars) — e.g. a reading that's still mid-typed. slice(0, negative)
    // would otherwise wrap around and return a truncated garbage string.
    expect(kanjiOnlyEntry("至るかもしれ", "いたる")).toEqual({
      label: "至",
      reading: "いたる",
    })
  })
})

describe("deriveFurigana", () => {
  it("derives a kanji-only furigana map from tested word/reading pairs", () => {
    expect(
      deriveFurigana([
        { label: "結論", reading: "けつろん" },
        { label: "至る", reading: "いたる" },
      ]),
    ).toEqual({ 結論: "けつろん", 至: "いた" })
  })

  it("skips blank labels or readings", () => {
    expect(deriveFurigana([{ label: "", reading: "けつろん" }])).toEqual({})
    expect(deriveFurigana([{ label: "結論", reading: "" }])).toEqual({})
  })
})

describe("reseedFurigana", () => {
  it("replaces a stale (untouched) auto-seeded entry with the new one", () => {
    expect(
      reseedFurigana({ 至: "いた" }, { 至: "いた" }, { 至: "いたr" }),
    ).toEqual({ 至: "いたr" })
  })

  it("leaves an entry the author manually edited since the last seed untouched", () => {
    expect(
      reseedFurigana({ 至: "いた!" }, { 至: "いた" }, { 至: "いたる" }),
    ).toEqual({ 至: "いた!" })
  })

  it("adds new seed entries without touching unrelated manual entries", () => {
    expect(
      reseedFurigana({ 大好き: "だいすき" }, {}, { 結論: "けつろん" }),
    ).toEqual({ 大好き: "だいすき", 結論: "けつろん" })
  })

  it("removes an old seed entry that's no longer produced by the new seed", () => {
    expect(reseedFurigana({ 至: "いた" }, { 至: "いた" }, {})).toEqual({})
  })
})

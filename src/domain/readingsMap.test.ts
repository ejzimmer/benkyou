import { describe, expect, it } from "vitest"
import {
  addMissingKanjiLines,
  deriveFurigana,
  annotatedSegments,
  fullyCoveredSegments,
  furiganaSegments,
  joinSegmentReadings,
  kanjiOnlyEntry,
  parseReadingsMapText,
  readingsMapToText,
  segmentText,
  withWordReadingFallback,
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

describe("addMissingKanjiLines", () => {
  it("appends a blank line for every kanji found in the source texts", () => {
    expect(addMissingKanjiLines("", ["結論に至る"])).toBe("結=\n論=\n至=")
  })

  it("dedupes repeated kanji across multiple source texts", () => {
    expect(addMissingKanjiLines("", ["結論", "結論に至る"])).toBe("結=\n論=\n至=")
  })

  it("skips a kanji already present as its own key", () => {
    expect(addMissingKanjiLines("結=けつ", ["結論"])).toBe("結=けつ\n論=")
  })

  it("skips a kanji already covered by a longer existing key", () => {
    expect(addMissingKanjiLines("結論=けつろん", ["結論に至る"])).toBe(
      "結論=けつろん\n至=",
    )
  })

  it("ignores non-kanji characters", () => {
    expect(addMissingKanjiLines("", ["ねこ"])).toBe("")
  })

  it("leaves the text unchanged when there's nothing new to add", () => {
    expect(addMissingKanjiLines("結論=けつろん", ["結論"])).toBe("結論=けつろん")
  })

  it("ignores an incomplete draft line with no separator when checking coverage", () => {
    expect(addMissingKanjiLines("結論", ["結論"])).toBe("結論\n結=\n論=")
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

describe("annotatedSegments", () => {
  it("returns every entry the map matches, leaving the rest bare", () => {
    expect(annotatedSegments("結論に至る", { 結論: "けつろん" })).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "に" },
      { text: "至" },
      { text: "る" },
    ])
  })

  it("returns undefined when the map annotates nothing in the text", () => {
    expect(annotatedSegments("学生", { 結論: "けつろん" })).toBeUndefined()
    expect(annotatedSegments("学生", {})).toBeUndefined()
  })

  it("ignores entries with a blank reading", () => {
    expect(annotatedSegments("学生", { 学生: "  " })).toBeUndefined()
  })
})

describe("joinSegmentReadings", () => {
  it("joins readings with the unannotated kana between them", () => {
    expect(
      joinSegmentReadings([
        { text: "結論", reading: "けつろん" },
        { text: "に" },
        { text: "至る", reading: "いたる" },
      ]),
    ).toBe("けつろんにいたる")
  })

  it("returns undefined when an unannotated segment still has kanji", () => {
    expect(
      joinSegmentReadings([
        { text: "特殊", reading: "とくしゅ" },
        { text: "な" },
        { text: "製" },
        { text: "法" },
      ]),
    ).toBeUndefined()
  })

  it("returns undefined when nothing is annotated", () => {
    expect(joinSegmentReadings([{ text: "学生" }])).toBeUndefined()
    expect(joinSegmentReadings(undefined)).toBeUndefined()
  })
})

describe("furiganaSegments", () => {
  it("uses the map when it accounts for every kanji, over the whole-word reading", () => {
    expect(
      furiganaSegments(
        "結論に至る",
        { 結論: "けつろん", 至る: "いたる" },
        "けつろんにいたる",
      ),
    ).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "に" },
      { text: "至る", reading: "いたる" },
    ])
  })

  it("keeps a partial map when there is no whole-word reading", () => {
    expect(furiganaSegments("特殊な製法", { 特殊: "とくしゅ" }, undefined)).toEqual(
      [
        { text: "特殊", reading: "とくしゅ" },
        { text: "な" },
        { text: "製" },
        { text: "法" },
      ],
    )
  })

  it("defers to the whole-word reading when the map covers only part", () => {
    // 人=ひと, written for an example sentence, must not override 大人=おとな.
    expect(furiganaSegments("大人", { 人: "ひと" }, "おとな")).toBeUndefined()
  })

  it("returns undefined when the map annotates nothing", () => {
    expect(furiganaSegments("大人", { 猫: "ねこ" }, "おとな")).toBeUndefined()
    expect(furiganaSegments("大人", undefined, "おとな")).toBeUndefined()
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

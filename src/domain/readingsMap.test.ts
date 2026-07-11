import { describe, expect, it } from "vitest"
import {
  fullyCoveredSegments,
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

import { describe, expect, it } from "vitest"
import { constructionReadingSegments, hasConstructionReading } from "./grammarContent"
import type { GrammarCardContent } from "./types"

const base: GrammarCardContent = {
  sentenceWithGap: "___",
  gapMarker: "___",
  construction: "学生",
  translationEn: "",
  readings: {},
  images: [],
  synonymsJa: [],
}

describe("constructionReadingSegments", () => {
  it("is undefined when there are no reading parts", () => {
    expect(constructionReadingSegments(base)).toBeUndefined()
  })

  it("is undefined for a single reading part — that's what constructionReading is for", () => {
    expect(
      constructionReadingSegments({
        ...base,
        constructionReadingParts: { 学生: "がくせい" },
      }),
    ).toBeUndefined()
  })

  it("defers to the explicit constructionReading field when set", () => {
    expect(
      constructionReadingSegments({
        ...base,
        constructionReading: "がくせい",
        constructionReadingParts: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toBeUndefined()
  })

  it("splits a multi-cluster construction into ordered segments, independent of the literal construction text", () => {
    expect(
      constructionReadingSegments({
        ...base,
        construction: "結論に至る",
        constructionReadingParts: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "至る", reading: "いたる" },
    ])
  })

  it("tests a dictionary-form reading for a conjugated construction", () => {
    // 芳しく is a conjugated form of 芳しい — the tested reading is
    // independent of the literal construction text, so segments/labels
    // don't need to be substrings of `construction` at all.
    expect(
      constructionReadingSegments({
        ...base,
        construction: "芳しく",
        constructionReadingParts: { 芳しい: "かんばしい", もう一つ: "もうひとつ" },
      }),
    ).toEqual([
      { text: "芳しい", reading: "かんばしい" },
      { text: "もう一つ", reading: "もうひとつ" },
    ])
  })
})

describe("hasConstructionReading", () => {
  it("is false with no reading configured", () => {
    expect(hasConstructionReading(base)).toBe(false)
  })

  it("is true when constructionReading is set", () => {
    expect(
      hasConstructionReading({ ...base, constructionReading: "がくせい" }),
    ).toBe(true)
  })

  it("is true with 2+ reading parts", () => {
    expect(
      hasConstructionReading({
        ...base,
        constructionReadingParts: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toBe(true)
  })

  it("is false with only a single reading part", () => {
    expect(
      hasConstructionReading({
        ...base,
        constructionReadingParts: { 学生: "がくせい" },
      }),
    ).toBe(false)
  })
})

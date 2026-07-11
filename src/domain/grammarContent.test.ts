import { describe, expect, it } from "vitest"
import { constructionReadingSegments } from "./grammarContent"
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
  it("is undefined when the construction has no kanji", () => {
    expect(
      constructionReadingSegments({ ...base, construction: "です" }),
    ).toBeUndefined()
  })

  it("is undefined when the readings map doesn't cover the construction", () => {
    expect(constructionReadingSegments(base)).toBeUndefined()
  })

  it("returns the single segment for a plain kanji construction", () => {
    expect(
      constructionReadingSegments({
        ...base,
        readings: { 学生: "がくせい" },
      }),
    ).toEqual([{ text: "学生", reading: "がくせい" }])
  })

  it("splits a multi-cluster construction into ordered segments", () => {
    expect(
      constructionReadingSegments({
        ...base,
        construction: "結論に至る",
        readings: { 結論: "けつろん", 至る: "いたる" },
      }),
    ).toEqual([
      { text: "結論", reading: "けつろん" },
      { text: "に" },
      { text: "至る", reading: "いたる" },
    ])
  })
})

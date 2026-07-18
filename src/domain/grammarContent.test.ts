import { describe, expect, it } from "vitest"
import {
  constructionReadingSegments,
  hasConstructionReading,
  isSingleSided,
} from "./grammarContent"
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

  it("falls back to the legacy readings map when constructionReadingParts was never authored", () => {
    // Cards built before constructionReading/constructionReadingParts
    // existed (or imported from Anki) had only the furigana map to work
    // with — this must keep enabling grammar_type_reading without any
    // manual migration.
    expect(
      constructionReadingSegments({
        ...base,
        readings: { 学生: "がくせい" },
      }),
    ).toEqual([{ text: "学生", reading: "がくせい" }])
  })

  it("legacy fallback needs only one covered cluster, unlike the explicit-field rule (grammar never had a separate single-reading field before)", () => {
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

  it("does not fall back once constructionReadingParts has been explicitly started", () => {
    expect(
      constructionReadingSegments({
        ...base,
        constructionReadingParts: { 学生: "がくせい" },
        readings: { 学生: "がくせい" },
      }),
    ).toBeUndefined()
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

  it("is true from the legacy readings map alone (pre-existing/imported card)", () => {
    expect(
      hasConstructionReading({ ...base, readings: { 学生: "がくせい" } }),
    ).toBe(true)
  })
})

describe("isSingleSided", () => {
  it("is false when singleSided is unset and there's no legacy grammarPoint", () => {
    expect(isSingleSided(base)).toBe(false)
  })

  it("reflects the singleSided flag directly once set", () => {
    expect(isSingleSided({ ...base, singleSided: true })).toBe(true)
    expect(isSingleSided({ ...base, singleSided: false })).toBe(false)
  })

  it("falls back to a still-unmigrated grammarPoint on an old card", () => {
    // Cards saved before grammarPoint was renamed to singleSided keep
    // whatever shape they were written with — Dexie/Firestore don't strip
    // fields that fell out of the type.
    const legacyCard = { ...base, grammarPoint: "conjugation" } as GrammarCardContent
    expect(isSingleSided(legacyCard)).toBe(true)
  })

  it("prefers the new field over a stale legacy grammarPoint once both are present", () => {
    const card = {
      ...base,
      singleSided: false,
      grammarPoint: "conjugation",
    } as GrammarCardContent
    expect(isSingleSided(card)).toBe(false)
  })
})

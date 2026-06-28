import { describe, expect, it } from "vitest"
import {
  extractEnglishLines,
  hasGapMarker,
  normalizeGapMarkers,
  readingValue,
} from "./html"

describe("html helpers", () => {
  it("detects fullwidth underscore gaps", () => {
    expect(hasGapMarker("＿＿羽根馬車を＿＿")).toBe(true)
  })

  it("normalizes fullwidth underscores to ___", () => {
    expect(normalizeGapMarkers("＿＿羽根馬車を＿＿")).toBe("___羽根馬車を___")
  })

  it("does not treat Japanese answers as English lines", () => {
    expect(extractEnglishLines("流し、呼ぶ")).toEqual([])
    expect(extractEnglishLines("formation<br>流し、呼ぶ")).toEqual(["formation"])
  })
})

describe("readingValue", () => {
  it("returns bare kana unchanged", () => {
    expect(readingValue("じん")).toBe("じん")
  })
  it("unwraps quote-wrapped kana", () => {
    expect(readingValue("«じん»")).toBe("じん")
  })
  it("strips a trailing の読み from bare kana", () => {
    expect(readingValue("じんの読み")).toBe("じん")
  })
  it("strips の読み outside the quotes", () => {
    expect(readingValue("«じん»の読み")).toBe("じん")
  })
  it("strips の読み inside the quotes", () => {
    expect(readingValue("«じんの読み»")).toBe("じん")
  })
})

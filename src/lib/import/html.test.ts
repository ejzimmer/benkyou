import { describe, expect, it } from "vitest"
import {
  extractEnglishLines,
  extractMediaRefs,
  hasGapMarker,
  normalizeGapMarkers,
} from "./html"

describe("html helpers", () => {
  it("detects fullwidth underscore gaps", () => {
    expect(hasGapMarker("＿＿羽根馬車を＿＿")).toBe(true)
  })

  it("normalizes fullwidth underscores to ___", () => {
    expect(normalizeGapMarkers("＿＿羽根馬車を＿＿")).toBe("___羽根馬車を___")
  })

  it("normalizes media refs like parseApkg", () => {
    expect(extractMediaRefs('<img src="sample.jpg?v=1">')).toEqual(["sample.jpg"])
    expect(extractMediaRefs('<img src="foo%20bar.png">')).toEqual(["foo bar.png"])
  })

  it("does not treat Japanese answers as English lines", () => {
    expect(extractEnglishLines("流し、呼ぶ")).toEqual([])
    expect(extractEnglishLines("formation<br>流し、呼ぶ")).toEqual(["formation"])
  })
})

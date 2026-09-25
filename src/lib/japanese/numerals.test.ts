import { describe, expect, it } from "vitest"
import { arabicToKanjiNumerals } from "./numerals"

describe("arabicToKanjiNumerals", () => {
  it.each([
    ["1時", "一時"],
    ["11", "十一"],
    ["10", "十"],
    ["20", "二十"],
    ["100", "百"],
    ["105", "百五"],
    ["1000", "千"],
    ["2024年", "二千二十四年"],
    ["10000", "一万"],
    ["12345", "一万二千三百四十五"],
    ["100000000", "一億"],
    ["0", "〇"],
    ["05分", "五分"],
    ["３月１５日", "三月十五日"],
  ])("%s → %s", (input, expected) => {
    expect(arabicToKanjiNumerals(input)).toBe(expected)
  })

  it("leaves text without Arabic numerals unchanged", () => {
    expect(arabicToKanjiNumerals("一一時")).toBe("一一時")
  })
})

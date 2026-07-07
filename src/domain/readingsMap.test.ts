import { describe, expect, it } from "vitest"
import {
  parseReadingsMapText,
  readingsMapToText,
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

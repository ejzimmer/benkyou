import { describe, expect, it } from "vitest"
import { parseReadingsMapText, readingsMapToText } from "./readingsMap"

describe("readingsMapToText / parseReadingsMapText", () => {
  it("round-trips completed lines", () => {
    const r = { 私: "わたし", 学生: "がくせい" }
    expect(parseReadingsMapText(readingsMapToText(r))).toEqual(r)
  })

  it("parse ignores incomplete lines without equals", () => {
    expect(parseReadingsMapText("私\n私=")).toEqual({ 私: "" })
  })
})

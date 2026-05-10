import { describe, expect, it } from "vitest"
import {
  grammarReadingsToText,
  parseGrammarReadingsText,
} from "./grammarReadings"

describe("grammarReadingsToText / parseGrammarReadingsText", () => {
  it("round-trips completed lines", () => {
    const r = { 私: "わたし", 学生: "がくせい" }
    expect(parseGrammarReadingsText(grammarReadingsToText(r))).toEqual(r)
  })

  it("parse ignores incomplete lines without equals", () => {
    expect(parseGrammarReadingsText("私\n私=")).toEqual({ 私: "" })
  })
})

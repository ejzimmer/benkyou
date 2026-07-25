import { describe, expect, it } from "vitest"
import {
  countGaps,
  detectGapMarker,
  normalizeGapAnswers,
  splitGapAnswers,
  typedGapValues,
} from "./grammarGaps"

describe("detectGapMarker", () => {
  it("finds a run of halfwidth underscores", () => {
    expect(detectGapMarker("私は____です")).toBe("____")
  })

  it("finds a run of fullwidth underscores", () => {
    expect(detectGapMarker("私は＿＿＿です")).toBe("＿＿＿")
  })

  it("falls back to three underscores when the sentence has no gap yet", () => {
    expect(detectGapMarker("私はです")).toBe("___")
  })
})

describe("countGaps", () => {
  it("counts inline gap-marker occurrences", () => {
    expect(countGaps("___を___", "___")).toBe(2)
    expect(countGaps("私は___です", "___")).toBe(1)
  })

  it("returns 0 when the marker is missing or blank", () => {
    expect(countGaps("テスト", "___")).toBe(0)
    expect(countGaps("私は___です", "")).toBe(0)
  })
})

describe("splitGapAnswers", () => {
  it("splits on ASCII comma", () => {
    expect(splitGapAnswers("流し, 呼ぶ")).toEqual(["流し", "呼ぶ"])
  })

  it("splits on the Japanese comma", () => {
    expect(splitGapAnswers("流し、呼ぶ")).toEqual(["流し", "呼ぶ"])
  })

  it("trims whitespace and drops empty parts", () => {
    expect(splitGapAnswers(" が ,  ,の ")).toEqual(["が", "の"])
  })

  it("returns a single-element array for a plain answer", () => {
    expect(splitGapAnswers("学生")).toEqual(["学生"])
  })
})

describe("normalizeGapAnswers", () => {
  it("canonicalizes any separator to ASCII comma + space", () => {
    expect(normalizeGapAnswers("流し、呼ぶ")).toBe("流し, 呼ぶ")
    expect(normalizeGapAnswers("流し,呼ぶ")).toBe("流し, 呼ぶ")
    expect(normalizeGapAnswers("流し, 呼ぶ")).toBe("流し, 呼ぶ")
  })
})

describe("typedGapValues", () => {
  it("splits a partially-typed answer into positional slots", () => {
    expect(typedGapValues("が, の", 2)).toEqual(["が", "の"])
  })

  it("pads with empty strings when fewer gaps have been typed", () => {
    expect(typedGapValues("が", 2)).toEqual(["が", ""])
    expect(typedGapValues("", 2)).toEqual(["", ""])
  })

  it("keeps an empty first gap when the user starts typing the second", () => {
    expect(typedGapValues(", の", 2)).toEqual(["", "の"])
  })
})

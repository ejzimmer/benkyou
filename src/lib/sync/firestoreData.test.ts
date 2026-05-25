import { describe, expect, it } from "vitest"
import { stableCompareJson, stripUndefinedDeep } from "./firestoreData"

describe("stripUndefinedDeep", () => {
  it("removes undefined top-level and nested fields", () => {
    expect(
      stripUndefinedDeep({
        id: "c1",
        meta: undefined,
        content: { wordJa: "x", reading: undefined, definitionsEn: [] },
      }),
    ).toEqual({
      id: "c1",
      content: { wordJa: "x", definitionsEn: [] },
    })
  })

  it("preserves null", () => {
    expect(stripUndefinedDeep({ meta: null })).toEqual({ meta: null })
  })
})

describe("stableCompareJson", () => {
  it("treats key order and undefined as equal", () => {
    expect(
      stableCompareJson(
        { b: 1, a: 2, nested: { z: undefined, y: 3 } },
        { a: 2, b: 1, nested: { y: 3 } },
      ),
    ).toBe(true)
  })
})

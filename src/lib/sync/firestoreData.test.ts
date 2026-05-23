import { describe, expect, it } from "vitest"
import { stripUndefinedDeep } from "./firestoreData"

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

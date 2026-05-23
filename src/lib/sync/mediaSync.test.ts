import { describe, expect, it } from "vitest"
import { isStorageObjectNotFound } from "./mediaSync"

describe("isStorageObjectNotFound", () => {
  it("matches Firebase Storage not-found errors", () => {
    expect(isStorageObjectNotFound({ code: "storage/object-not-found" })).toBe(
      true,
    )
  })

  it("rejects other errors", () => {
    expect(isStorageObjectNotFound({ code: "storage/unauthorized" })).toBe(
      false,
    )
    expect(isStorageObjectNotFound(new Error("nope"))).toBe(false)
  })
})

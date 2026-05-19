import { describe, expect, it } from "vitest"
import type { Deck } from "../../domain/types"
import { resolveByTimestamp } from "./syncCompare"

describe("resolveByTimestamp", () => {
  const deck = (updatedAt: number): Deck => ({
    id: "d1",
    name: "Test",
    updatedAt,
  })

  it("returns conflict when both sides changed since last sync", () => {
    const last = 1000
    expect(
      resolveByTimestamp(deck(2000), deck(3000), last, true),
    ).toBe("conflict")
  })

  it("picks remote when only remote changed", () => {
    expect(resolveByTimestamp(deck(500), deck(2000), 1000, true)).toBe(
      "remote",
    )
  })

  it("picks local when only local changed", () => {
    expect(resolveByTimestamp(deck(2000), deck(500), 1000, true)).toBe("local")
  })

  it("picks newer on first sync without asking", () => {
    expect(resolveByTimestamp(deck(100), deck(200), null, true)).toBe("remote")
  })
})

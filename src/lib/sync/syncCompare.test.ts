import { describe, expect, it } from "vitest"
import type { Card, Deck } from "../../domain/types"
import { cardChanged, resolveByTimestamp, resolveEntityMerge } from "./syncCompare"

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

  it("does not conflict when payloads match but both timestamps moved", () => {
    expect(resolveEntityMerge(deck(2000), deck(3000), 1000, true)).toBe("remote")
  })
})

describe("cardChanged", () => {
  const base: Card = {
    id: "c1",
    deckId: "d1",
    kind: "vocabulary",
    updatedAt: 1,
    content: {
      wordJa: "猫",
      definitionsEn: ["cat"],
      images: [],
      exampleSentences: [],
      synonymsJa: [],
    },
  }

  it("ignores undefined optional fields vs omitted fields", () => {
    const withMeta = { ...base, meta: undefined }
    const withoutMeta = { ...base }
    expect(cardChanged(withMeta, withoutMeta)).toBe(false)
  })

  it("ignores undefined reading vs omitted reading", () => {
    const a = {
      ...base,
      content: { ...base.content, reading: undefined },
    }
    const b = { ...base }
    expect(cardChanged(a, b)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import type { Card, Deck } from "../../domain/types"
import {
  cardChanged,
  cardDiffRows,
  preferNonEmptyCard,
  resolveByTimestamp,
  resolveEntityMerge,
} from "./syncCompare"

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

describe("preferNonEmptyCard", () => {
  const vocab = (wordJa: string): Card => ({
    id: "c1",
    deckId: "d1",
    kind: "vocabulary",
    updatedAt: 1,
    content: {
      wordJa,
      definitionsEn: ["cat"],
      images: [],
      exampleSentences: [],
    },
  })

  const grammar: Card = {
    id: "c2",
    deckId: "d1",
    kind: "grammar",
    updatedAt: 1,
    content: {
      sentenceWithGap: "___です",
      gapMarker: "___",
      construction: "猫",
      translationEn: "cat",
      images: [],
      readings: {},
    },
  }

  it("picks remote when only local's word is blank", () => {
    expect(preferNonEmptyCard(vocab(""), vocab("猫"))).toBe("remote")
  })

  it("picks remote when local's word is whitespace-only", () => {
    expect(preferNonEmptyCard(vocab("   "), vocab("猫"))).toBe("remote")
  })

  it("picks local when only remote's word is blank", () => {
    expect(preferNonEmptyCard(vocab("猫"), vocab(""))).toBe("local")
  })

  it("returns null when neither word is blank", () => {
    expect(preferNonEmptyCard(vocab("猫"), vocab("犬"))).toBeNull()
  })

  it("returns null when both words are blank", () => {
    expect(preferNonEmptyCard(vocab(""), vocab(""))).toBeNull()
  })

  it("does not apply to grammar cards", () => {
    expect(preferNonEmptyCard(grammar, grammar)).toBeNull()
  })
})

describe("cardDiffRows and not-a-duplicate verdicts", () => {
  function card(id: string, wordJa: string, notDuplicateOf?: string[]): Card {
    return {
      id,
      deckId: "d1",
      kind: "vocabulary",
      updatedAt: 1,
      notDuplicateOf,
      content: {
        wordJa,
        definitionsEn: [wordJa],
        images: [],
        exampleSentences: [],
      },
    }
  }

  const labels: Record<string, string> = { "c-2": "子猫", "c-3": "猫舌" }
  const cardLabel = (id: string) => labels[id]

  it("names the dismissed cards so two sides can be told apart", () => {
    const rows = cardDiffRows(
      card("c-1", "猫", ["c-2"]),
      card("c-1", "猫", ["c-3"]),
      cardLabel,
    )

    // Both sides have one entry — a count alone would read "1件" vs "1件"
    // and leave the user picking between identical-looking cards.
    expect(rows).toEqual([
      { label: "重複ではないとマーク済み", kind: "text", local: "子猫", remote: "猫舌" },
    ])
  })

  it("falls back to a count for ids it cannot resolve", () => {
    const rows = cardDiffRows(
      card("c-1", "猫", ["c-2", "c-9"]),
      card("c-1", "猫", []),
      cardLabel,
    )

    expect(rows).toEqual([
      {
        label: "重複ではないとマーク済み",
        kind: "text",
        local: "子猫、ほか1件",
        remote: "—",
      },
    ])
  })

  it("adds no row when both sides carry the same verdicts in any order", () => {
    expect(
      cardDiffRows(
        card("c-1", "猫", ["c-2", "c-3"]),
        card("c-1", "猫", ["c-3", "c-2"]),
        cardLabel,
      ),
    ).toEqual([])
  })
})

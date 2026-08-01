import { describe, expect, it, vi } from "vitest"
import {
  createVocabularyCard,
  loadSchedulingRow,
  markLeech,
  saveCard,
} from "./cards"
import { createDeck } from "./decks"
import { resetDatabase } from "../test/db"
import { getSessionEditedCardIds, clearSessionEdits } from "../lib/sync/sessionEdits"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

describe("markLeech", () => {
  it("flags the scheduling row and marks the card as a pending sync edit", async () => {
    await resetDatabase()
    const deck = await createDeck("D")
    const card = await createVocabularyCard(deck.id, {
      wordJa: "保険",
      reading: "ほけん",
      definitionsEn: [],
      images: [],
      exampleSentences: [],
    })
    clearSessionEdits()

    await markLeech(card.id, "vocab_type_reading")

    const row = await loadSchedulingRow(card.id, "vocab_type_reading")
    expect(row?.isLeech).toBe(true)
    expect(getSessionEditedCardIds()).toContain(card.id)
  })

  it("is a no-op for a mode with no scheduling row", async () => {
    await resetDatabase()
    const deck = await createDeck("D")
    const card = await createVocabularyCard(deck.id, {
      wordJa: "保険",
      reading: "ほけん",
      definitionsEn: [],
      images: [],
      exampleSentences: [],
    })
    clearSessionEdits()

    await markLeech(card.id, "grammar_type_construction")

    expect(getSessionEditedCardIds()).toEqual([])
  })
})

describe("saveCard", () => {
  it("clears the leech flag on the card's scheduling rows when it's edited", async () => {
    await resetDatabase()
    const deck = await createDeck("D")
    const card = await createVocabularyCard(deck.id, {
      wordJa: "保険",
      reading: "ほけん",
      definitionsEn: [],
      images: [],
      exampleSentences: [],
    })
    await markLeech(card.id, "vocab_type_reading")
    expect((await loadSchedulingRow(card.id, "vocab_type_reading"))?.isLeech).toBe(
      true,
    )

    if (card.kind !== "vocabulary") throw new Error("expected vocabulary card")
    await saveCard({
      ...card,
      content: { ...card.content, reading: "ほけん" },
    })

    expect(
      (await loadSchedulingRow(card.id, "vocab_type_reading"))?.isLeech,
    ).toBe(false)
  })
})

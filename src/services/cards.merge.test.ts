import { describe, expect, it, vi, beforeEach } from "vitest"
import { defaultVocabulary, mergeCards } from "./cards"
import { db } from "../lib/db/schema"
import { resetDatabase } from "../test/db"
import type { Card } from "../domain/types"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

describe("mergeCards", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("keeps the source card's media blobs, since the merged card now references them", async () => {
    await db.media.put({
      id: "img-source",
      blob: new Blob(["x"]),
      mimeType: "image/png",
      updatedAt: Date.now(),
    })

    const target: Card = {
      id: "card-target",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫", definitionsEn: ["cat"] },
      updatedAt: Date.now(),
    }
    const source: Card = {
      id: "card-source",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        ...defaultVocabulary(),
        wordJa: "猫",
        definitionsEn: ["feline"],
        images: ["img-source"],
      },
      updatedAt: Date.now(),
    }
    await db.cards.put(target)
    await db.cards.put(source)

    const merged = await mergeCards(target, source)

    expect(merged.content.images).toEqual(["img-source"])
    expect(await db.cards.get("card-source")).toBeUndefined()
    expect(await db.media.get("img-source")).toBeDefined()
  })

  it("deduplicates an image id shared by both cards", async () => {
    const target: Card = {
      id: "card-target",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫", images: ["img-1"] },
      updatedAt: Date.now(),
    }
    const source: Card = {
      id: "card-source",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫", images: ["img-1"] },
      updatedAt: Date.now(),
    }
    await db.cards.put(target)
    await db.cards.put(source)

    const merged = await mergeCards(target, source)

    expect(merged.content.images).toEqual(["img-1"])
  })
})

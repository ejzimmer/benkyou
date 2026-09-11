import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "../lib/db/schema"
import { resetDatabase } from "../test/db"
import {
  defaultVocabulary,
  markCardsNotDuplicates,
  mergeCardContent,
  unmarkCardsNotDuplicates,
} from "./cards"
import type { Card } from "../domain/types"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function vocabCard(id: string, wordJa: string, updatedAt = 1_000): Card {
  return {
    id,
    deckId: "deck-1",
    kind: "vocabulary",
    content: { ...defaultVocabulary(), wordJa, definitionsEn: [wordJa] },
    updatedAt,
  }
}

describe("markCardsNotDuplicates", () => {
  beforeEach(async () => {
    await resetDatabase()
    await db.cards.bulkPut([vocabCard("card-1", "猫"), vocabCard("card-2", "子猫")])
  })

  it("records the verdict on both cards and bumps their updatedAt", async () => {
    await markCardsNotDuplicates("card-1", "card-2")

    const [a, b] = await Promise.all([db.cards.get("card-1"), db.cards.get("card-2")])
    expect(a?.notDuplicateOf).toEqual(["card-2"])
    expect(b?.notDuplicateOf).toEqual(["card-1"])
    expect(a!.updatedAt).toBeGreaterThan(1_000)
    expect(b!.updatedAt).toBeGreaterThan(1_000)
  })

  it("clears the field entirely when the last verdict is undone", async () => {
    await markCardsNotDuplicates("card-1", "card-2")
    await unmarkCardsNotDuplicates("card-1", "card-2")

    const [a, b] = await Promise.all([db.cards.get("card-1"), db.cards.get("card-2")])
    expect(a?.notDuplicateOf).toBeUndefined()
    expect(b?.notDuplicateOf).toBeUndefined()
  })

  it("keeps other verdicts when one pair is undone", async () => {
    await db.cards.put(vocabCard("card-3", "猫舌"))
    await markCardsNotDuplicates("card-1", "card-2")
    await markCardsNotDuplicates("card-1", "card-3")
    await unmarkCardsNotDuplicates("card-1", "card-2")

    expect((await db.cards.get("card-1"))?.notDuplicateOf).toEqual(["card-3"])
  })

  it("leaves updatedAt alone when the verdict is already recorded", async () => {
    await markCardsNotDuplicates("card-1", "card-2")
    const after = (await db.cards.get("card-1"))!.updatedAt

    await markCardsNotDuplicates("card-1", "card-2")

    expect((await db.cards.get("card-1"))?.updatedAt).toBe(after)
  })

  it("still marks the surviving card when the other one is already gone", async () => {
    await db.cards.delete("card-2")

    await markCardsNotDuplicates("card-1", "card-2")

    expect((await db.cards.get("card-1"))?.notDuplicateOf).toEqual(["card-2"])
  })

  it("does not leave a card marked as not a duplicate of itself", async () => {
    await markCardsNotDuplicates("card-1", "card-1")

    expect((await db.cards.get("card-1"))?.notDuplicateOf).toBeUndefined()
  })
})

describe("mergeCardContent and not-duplicate verdicts", () => {
  it("unions both sides' verdicts, minus the two merged cards", () => {
    const target: Card = { ...vocabCard("card-1", "猫"), notDuplicateOf: ["card-2", "card-3"] }
    const source: Card = { ...vocabCard("card-2", "猫"), notDuplicateOf: ["card-1", "card-4"] }

    expect(mergeCardContent(target, source).notDuplicateOf).toEqual(["card-3", "card-4"])
  })

  it("leaves the field unset when neither card had a verdict", () => {
    const merged = mergeCardContent(vocabCard("card-1", "猫"), vocabCard("card-2", "猫"))
    expect(merged.notDuplicateOf).toBeUndefined()
  })
})

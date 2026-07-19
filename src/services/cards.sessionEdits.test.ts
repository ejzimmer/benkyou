import { beforeEach, describe, expect, it, vi } from "vitest"
import { defaultVocabulary } from "./cards"
import { saveCard, deleteCard, mergeCards } from "./cards"
import { db } from "../lib/db/schema"
import { resetDatabase } from "../test/db"
import { getSessionEditedCardIds, clearSessionEdits } from "../lib/sync/sessionEdits"
import type { Card } from "../domain/types"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function vocabCard(id: string): Card {
  return {
    id,
    deckId: "deck-1",
    kind: "vocabulary",
    content: { ...defaultVocabulary(), wordJa: "猫", definitionsEn: ["cat"] },
    updatedAt: Date.now(),
  }
}

describe("session-edit tracking around save/delete", () => {
  beforeEach(async () => {
    await resetDatabase()
    clearSessionEdits()
  })

  it("saveCard marks the card as edited this session", async () => {
    await saveCard(vocabCard("card-1"))
    expect(getSessionEditedCardIds()).toEqual(["card-1"])
  })

  it("deleteCard drops the card from the pending session-edit set — there's nothing left to push", async () => {
    await saveCard(vocabCard("card-1"))
    expect(getSessionEditedCardIds()).toEqual(["card-1"])

    await deleteCard("card-1")

    expect(getSessionEditedCardIds()).toEqual([])
  })

  it("deleteCard doesn't disturb other cards' pending edits", async () => {
    await saveCard(vocabCard("card-1"))
    await saveCard(vocabCard("card-2"))

    await deleteCard("card-1")

    expect(getSessionEditedCardIds()).toEqual(["card-2"])
  })

  it("mergeCards' internal delete of the merged-away source drops it from the pending set too", async () => {
    const target = vocabCard("card-target")
    const source = vocabCard("card-source")
    await db.cards.put(target)
    await db.cards.put(source)
    clearSessionEdits()

    await mergeCards(target, source)

    // The merged (surviving) card is pending; the merged-away source is not.
    expect(getSessionEditedCardIds()).toEqual(["card-target"])
  })
})

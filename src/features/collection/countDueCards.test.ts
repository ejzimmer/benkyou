import { beforeEach, describe, expect, it } from "vitest"
import { saveCard } from "../../services/cards"
import { db } from "../../lib/db/schema"
import { resetDatabase } from "../../test/db"
import { countDueCards } from "./countDueCards"

function createVocabularyCard(id: string) {
  return {
    id,
    deckId: "d1",
    kind: "vocabulary" as const,
    updatedAt: 0,
    content: { wordJa: "猫", definitionsEn: ["cat"], images: [], exampleSentences: [] },
  }
}

describe("countDueCards", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  describe("with new cards", () => {
    it("counts every review mode they're scheduled for", async () => {
      await saveCard(createVocabularyCard("c1"))
      await saveCard(createVocabularyCard("c2"))
      const rows = await db.scheduling.count()

      expect(await countDueCards(Date.now())).toBe(rows)
    })
  })

  describe("when a card's schedule is in the future", () => {
    it("leaves it out", async () => {
      await saveCard(createVocabularyCard("c1"))
      await db.scheduling.toCollection().modify({ due: Date.now() + 7 * 864e5 })

      expect(await countDueCards(Date.now())).toBe(0)
    })
  })
})

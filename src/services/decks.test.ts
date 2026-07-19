import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "../lib/db/schema"
import { resetDatabase } from "../test/db"
import { pushSessionEditsNow } from "./decks"
import { clearSessionEdits, markCardEdited } from "../lib/sync/sessionEdits"
import type { Card } from "../domain/types"
import type { User } from "firebase/auth"

const upsertCardRemote = vi.fn()
const upsertSchedulingRemote = vi.fn()

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => ({}),
  getFirestoreDb: () => ({}),
  isFirebaseConfigured: () => true,
}))

vi.mock("../lib/sync/firestoreSync", () => ({
  upsertCardRemote: (...args: unknown[]) => upsertCardRemote(...args),
  upsertSchedulingRemote: (...args: unknown[]) => upsertSchedulingRemote(...args),
}))

const FAKE_USER = { uid: "user-1" } as User

describe("pushSessionEditsNow", () => {
  beforeEach(async () => {
    await resetDatabase()
    clearSessionEdits()
    upsertCardRemote.mockClear()
    upsertSchedulingRemote.mockClear()
  })

  it("pushes only the cards marked edited this session, plus their scheduling rows, then clears the session", async () => {
    const editedCard: Card = {
      id: "card-edited",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        wordJa: "猫",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      updatedAt: Date.now(),
    }
    const untouchedCard: Card = { ...editedCard, id: "card-untouched" }
    await db.cards.bulkPut([editedCard, untouchedCard])
    await db.scheduling.bulkPut([
      {
        id: "card-edited:vocab_oral_en",
        cardId: "card-edited",
        modeId: "vocab_oral_en",
        fsrs: {} as never,
        due: 0,
        updatedAt: Date.now(),
      },
      {
        id: "card-untouched:vocab_oral_en",
        cardId: "card-untouched",
        modeId: "vocab_oral_en",
        fsrs: {} as never,
        due: 0,
        updatedAt: Date.now(),
      },
    ])

    markCardEdited("card-edited")

    await pushSessionEditsNow(FAKE_USER)

    expect(upsertCardRemote).toHaveBeenCalledTimes(1)
    expect(upsertCardRemote).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({ id: "card-edited" }),
    )
    expect(upsertSchedulingRemote).toHaveBeenCalledTimes(1)
    expect(upsertSchedulingRemote).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({ id: "card-edited:vocab_oral_en" }),
    )
  })

  it("clears the pushed cards from the session edit set", async () => {
    const card: Card = {
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        wordJa: "猫",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      updatedAt: Date.now(),
    }
    await db.cards.put(card)
    markCardEdited("card-1")

    await pushSessionEditsNow(FAKE_USER)

    const { getSessionEditedCardIds } = await import("../lib/sync/sessionEdits")
    expect(getSessionEditedCardIds()).toEqual([])
  })
})

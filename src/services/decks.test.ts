import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "../lib/db/schema"
import { resetDatabase } from "../test/db"
import { pushSessionEditsNow } from "./decks"
import {
  clearSessionEdits,
  getSessionEditedCardIds,
  markCardEdited,
} from "../lib/sync/sessionEdits"
import type { Card } from "../domain/types"
import type { User } from "firebase/auth"

const upsertCardRemote = vi.fn()
const upsertSchedulingRemote = vi.fn()
const pushLocalMediaToRemote = vi.fn()

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => ({}),
  getFirestoreDb: () => ({}),
  isFirebaseConfigured: () => true,
}))

vi.mock("../lib/sync/firestoreSync", () => ({
  upsertCardRemote: (...args: unknown[]) => upsertCardRemote(...args),
  upsertSchedulingRemote: (...args: unknown[]) => upsertSchedulingRemote(...args),
}))

vi.mock("../lib/sync/mediaSync", () => ({
  pushLocalMediaToRemote: (...args: unknown[]) => pushLocalMediaToRemote(...args),
}))

const FAKE_USER = { uid: "user-1" } as User

function vocabCard(overrides: Partial<Card> & { id: string }): Card {
  return {
    deckId: "deck-1",
    kind: "vocabulary",
    content: {
      wordJa: "猫",
      definitionsEn: ["cat"],
      images: [],
      exampleSentences: [],
    },
    updatedAt: Date.now(),
    ...overrides,
  } as Card
}

describe("pushSessionEditsNow", () => {
  beforeEach(async () => {
    await resetDatabase()
    clearSessionEdits()
    upsertCardRemote.mockClear()
    upsertSchedulingRemote.mockClear()
    pushLocalMediaToRemote.mockClear()
  })

  it("pushes only the cards marked edited this session, plus their scheduling rows, then clears the session", async () => {
    const editedCard = vocabCard({ id: "card-edited" })
    const untouchedCard = vocabCard({ id: "card-untouched" })
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
    const card = vocabCard({ id: "card-1" })
    await db.cards.put(card)
    markCardEdited("card-1")

    await pushSessionEditsNow(FAKE_USER)

    expect(getSessionEditedCardIds()).toEqual([])
  })

  it("also pushes the edited cards' images, so a newly attached image isn't left broken on another device", async () => {
    const card = vocabCard({ id: "card-with-image" })
    card.content.images = ["img-1", "img-2"]
    await db.cards.put(card)
    markCardEdited("card-with-image")

    await pushSessionEditsNow(FAKE_USER)

    expect(pushLocalMediaToRemote).toHaveBeenCalledTimes(1)
    expect(pushLocalMediaToRemote).toHaveBeenCalledWith(
      "user-1",
      expect.arrayContaining([expect.objectContaining({ id: "card-with-image" })]),
    )
  })

  it("drops a session-edited id for a card that was since deleted, without pushing or throwing", async () => {
    // No db.cards row for this id — simulates a card that was edited then
    // deleted before "Sync edits" was clicked.
    markCardEdited("card-gone")

    await expect(pushSessionEditsNow(FAKE_USER)).resolves.toBeUndefined()

    expect(upsertCardRemote).not.toHaveBeenCalled()
    expect(getSessionEditedCardIds()).toEqual([])
  })

  it("does nothing, and leaves the edit pending, when there is no signed-in user", async () => {
    const card = vocabCard({ id: "card-1" })
    await db.cards.put(card)
    markCardEdited("card-1")

    await pushSessionEditsNow(null)

    expect(upsertCardRemote).not.toHaveBeenCalled()
    expect(pushLocalMediaToRemote).not.toHaveBeenCalled()
    expect(getSessionEditedCardIds()).toEqual(["card-1"])
  })
})

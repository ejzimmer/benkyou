import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetDatabase } from "../test/db"
import { createDeck } from "./decks"
import { createVocabularyCard } from "./cards"
import { agentListDue, agentListTrouble } from "./agentLocal"

vi.mock("../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../lib/sync/firestoreSync", () => ({
  pushLocalToRemote: vi.fn(),
  pullRemoteToLocal: vi.fn(),
  upsertDeckRemote: vi.fn(),
  upsertCardRemote: vi.fn(),
  upsertSchedulingRemote: vi.fn(),
}))

describe("agentLocal", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("agentListDue includes card when scheduling is due", async () => {
    const deck = await createDeck("T")
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "本",
        reading: "ほん",
        definitionsEn: ["book"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      null,
    )
    const due = await agentListDue(Date.now() + 7 * 24 * 60 * 60 * 1000)
    expect(due.length).toBeGreaterThan(0)
  })

  it("agentListTrouble returns array (may be empty for new cards)", async () => {
    const t = await agentListTrouble(10)
    expect(Array.isArray(t)).toBe(true)
  })
})

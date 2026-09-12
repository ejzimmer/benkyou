import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { ReviewSessionPage } from "./ReviewSessionPage"
import { resetDatabase } from "../../test/db"
import { createDeck } from "../../services/decks"
import { createVocabularyCard } from "../../services/cards"
import { db } from "../../lib/db/schema"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../../lib/sync/firestoreSync", () => ({
  upsertDeckRemote: vi.fn(),
  upsertCardRemote: vi.fn(),
  upsertSchedulingRemote: vi.fn(),
}))

function renderReview() {
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/review" element={<ReviewSessionPage />} />
            <Route path="/" element={<p>Landing page</p>} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * One card only, so the session can't advance past it while a test is
 * inspecting its duplicate indicator, and reading-only so it contributes a
 * single review mode.
 */
async function seedCard(wordJa: string, reading: string) {
  const deck = await createDeck("T")
  return createVocabularyCard(deck.id, {
    wordJa,
    reading,
    definitionsEn: [],
    images: [],
    exampleSentences: [],
  })
}

/**
 * Pin the session to the one oral mode, so the prompt has no typing input
 * and the queue can't shuffle a different mode to the front. Content alone
 * can't produce a card with only `vocab_oral_en`, so drop the other modes'
 * scheduling rows — the due queue is built from those.
 */
async function seedOralOnlyCard(wordJa: string, definition: string) {
  const deck = await createDeck("T")
  const card = await createVocabularyCard(deck.id, {
    wordJa,
    definitionsEn: [definition],
    images: [],
    exampleSentences: [],
  })
  const rows = await db.scheduling.where("cardId").equals(card.id).toArray()
  for (const row of rows) {
    if (row.modeId !== "vocab_oral_en") await db.scheduling.delete(row.id)
  }
  return card
}

describe("duplicate indicator on the review screen", () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await resetDatabase()
  })

  it("shows nothing when the card under review has no duplicates", async () => {
    await seedCard("猫", "ねこ")

    renderReview()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /答えを見る/ })).toBeEnabled()
    })
    expect(screen.queryByRole("button", { name: /重複/ })).not.toBeInTheDocument()
  })

  it("flags a duplicate and lists it without leaving the session", async () => {
    const card = await seedCard("猫", "ねこ")
    await db.cards.put({
      id: "other-card",
      deckId: card.deckId,
      kind: "vocabulary",
      content: {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat (a second card for the same word)"],
        images: [],
        exampleSentences: [],
      },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderReview()

    const badge = await screen.findByRole("button", {
      name: "重複の可能性があるカードが1枚あります",
    })
    await user.click(badge)

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/猫/)).toBeInTheDocument()
    // Merging needs the edit form's draft, so it isn't offered here.
    expect(within(dialog).queryByRole("button", { name: "統合" })).not.toBeInTheDocument()

    // The session is still underneath, uninterrupted.
    expect(screen.getByRole("button", { name: /答えを見る/ })).toBeInTheDocument()
  })

  it("stops flagging a pair once it is marked as not a duplicate", async () => {
    const card = await seedCard("猫", "ねこ")
    await db.cards.put({
      id: "other-card",
      deckId: card.deckId,
      kind: "vocabulary",
      content: {
        wordJa: "猫舌",
        reading: "ねこじた",
        definitionsEn: ["sensitive to hot food"],
        images: [],
        exampleSentences: [],
      },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderReview()

    await user.click(await screen.findByRole("button", { name: /重複の可能性/ }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "重複ではない",
      }),
    )

    // The badge goes away, and the verdict is recorded on both cards so the
    // other one stops flagging this pair too.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /重複の可能性/ })).not.toBeInTheDocument()
    })
    expect((await db.cards.get(card.id))?.notDuplicateOf).toEqual(["other-card"])
    expect((await db.cards.get("other-card"))?.notDuplicateOf).toEqual([card.id])
  })

  it("does not let Enter on a modal button fall through and reveal the answer", async () => {
    const card = await seedCard("猫", "ねこ")
    await db.cards.put({
      id: "other-card",
      deckId: card.deckId,
      kind: "vocabulary",
      content: {
        wordJa: "猫舌",
        reading: "ねこじた",
        definitionsEn: ["sensitive to hot food"],
        images: [],
        exampleSentences: [],
      },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderReview()

    await user.click(await screen.findByRole("button", { name: /重複の可能性/ }))
    const dialog = await screen.findByRole("dialog")
    within(dialog).getByRole("button", { name: "重複ではない" }).focus()
    await user.keyboard("{Enter}")

    // The button activated, and the session behind the modal stayed on the
    // prompt rather than revealing the answer with nothing typed.
    await waitFor(async () => {
      expect((await db.cards.get(card.id))?.notDuplicateOf).toEqual(["other-card"])
    })
    expect(screen.queryByRole("button", { name: /^正解$/ })).not.toBeInTheDocument()
  })

  it("opens the modal when the badge is reached by keyboard", async () => {
    const card = await seedOralOnlyCard("猫", "cat")
    await db.cards.put({
      id: "other-card",
      deckId: card.deckId,
      kind: "vocabulary",
      content: {
        wordJa: "猫舌",
        reading: "ねこじた",
        definitionsEn: ["sensitive to hot food"],
        images: [],
        exampleSentences: [],
      },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderReview()

    const badge = await screen.findByRole("button", { name: /重複の可能性/ })
    badge.focus()
    await user.keyboard("{Enter}")

    // The badge activated rather than the window-level Enter handler
    // swallowing it and revealing the answer instead.
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^正解$/ })).not.toBeInTheDocument()
  })
})

describe("Enter still reveals the answer in oral modes", () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await resetDatabase()
  })

  it("reveals on Enter with nothing focused", async () => {
    await seedOralOnlyCard("猫", "cat")

    const user = userEvent.setup()
    renderReview()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /答えを見る/ })).toBeEnabled()
    })
    // The window-level handler is what covers Enter with no control focused.
    ;(document.activeElement as HTMLElement | null)?.blur()
    await user.keyboard("{Enter}")

    expect(await screen.findByRole("button", { name: /^正解$/ })).toBeInTheDocument()
  })

  it("reveals on Enter with the reveal button focused", async () => {
    await seedOralOnlyCard("猫", "cat")

    const user = userEvent.setup()
    renderReview()

    const reveal = await screen.findByRole("button", { name: /答えを見る/ })
    await waitFor(() => expect(reveal).toBeEnabled())
    reveal.focus()
    await user.keyboard("{Enter}")

    expect(await screen.findByRole("button", { name: /^正解$/ })).toBeInTheDocument()
  })
})

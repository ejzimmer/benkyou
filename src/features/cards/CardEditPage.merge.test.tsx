import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"
import { defaultVocabulary } from "../../services/cards"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function renderEditPage(deckId: string, cardId: string) {
  render(
    <MemoryRouter initialEntries={[`/decks/${deckId}/cards/${cardId}`]}>
      <AuthProvider>
        <SyncProvider>
        <Routes>
          <Route path="/decks/:deckId" element={<div>Deck page</div>} />
          <Route
            path="/decks/:deckId/cards/:cardId"
            element={<CardEditPage />}
          />
        </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("CardEditPage duplicate finder / merge", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("finds other cards containing the current word and merges on request", async () => {
    await db.cards.put({
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫", definitionsEn: ["cat"] },
      updatedAt: Date.now(),
    })
    await db.cards.put({
      id: "card-2",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        ...defaultVocabulary(),
        wordJa: "子猫",
        definitionsEn: ["kitten (contains 猫)"],
      },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await waitFor(() => {
      expect(screen.getByDisplayValue("猫")).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole("button", { name: "重複カード検索" }),
    )

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/子猫/)).toBeInTheDocument()

    await user.click(
      within(dialog).getByRole("button", { name: "統合" }),
    )

    await waitFor(() => {
      expect(
        within(dialog).queryByText(/子猫/),
      ).not.toBeInTheDocument()
    })
    expect(
      within(dialog).getByText(/この単語を含む他のカードはありません/),
    ).toBeInTheDocument()

    expect(screen.getByLabelText("意味")).toHaveValue(
      "cat; kitten (contains 猫)",
    )

    await waitFor(async () => {
      expect(await db.cards.get("card-2")).toBeUndefined()
      const merged = await db.cards.get("card-1")
      expect(merged?.kind).toBe("vocabulary")
      if (merged?.kind !== "vocabulary") return
      expect(merged.content.definitionsEn).toEqual([
        "cat",
        "kitten (contains 猫)",
      ])
    })
  })

  it("keeps a whole-word reading and merged per-cluster readings both intact after a merge", async () => {
    await db.cards.put({
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        ...defaultVocabulary(),
        wordJa: "結論に至る",
        reading: "けつろんにいたる",
        definitionsEn: ["conclusion"],
      },
      updatedAt: Date.now(),
    })
    await db.cards.put({
      id: "card-2",
      deckId: "deck-1",
      kind: "vocabulary",
      content: {
        ...defaultVocabulary(),
        wordJa: "結論に至る",
        readingParts: { 結論: "けつろん", 至る: "いたる" },
        definitionsEn: ["arrive at a conclusion"],
      },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await waitFor(() => {
      expect(screen.getByDisplayValue("結論に至る")).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole("button", { name: "重複カード検索" }),
    )
    const dialog = await screen.findByRole("dialog")
    await user.click(
      within(dialog).getByRole("button", { name: "統合" }),
    )

    await waitFor(() => {
      expect(within(dialog).queryByText(/結論に至る/)).not.toBeInTheDocument()
    })

    // The whole-word reading survived the merge and shows in the Reading
    // field...
    expect(screen.getByRole("textbox", { name: /^reading$/i })).toHaveValue(
      "けつろんにいたる",
    )

    // ...and the per-cluster readings survived alongside it in the
    // underlying data, even though this field doesn't surface them (the UI
    // has never offered a way to author multi-cluster readings directly).
    await waitFor(async () => {
      const merged = await db.cards.get("card-1")
      expect(merged?.kind).toBe("vocabulary")
      if (merged?.kind !== "vocabulary") return
      expect(merged.content.readingParts).toEqual({
        結論: "けつろん",
        至る: "いたる",
      })
    })
  })

  it("shows a message when there are no matching cards", async () => {
    await db.cards.put({
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫", definitionsEn: ["cat"] },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await waitFor(() => {
      expect(screen.getByDisplayValue("猫")).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole("button", { name: "重複カード検索" }),
    )

    expect(
      await screen.findByText(/この単語を含む他のカードはありません/),
    ).toBeInTheDocument()
  })
})

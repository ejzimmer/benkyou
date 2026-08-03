import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { DeckPage } from "./DeckPage"
import { resetDatabase } from "../../test/db"
import * as decksService from "../../services/decks"
import { createDeck } from "../../services/decks"
import { createVocabularyCard, loadSchedulingRow, markLeech } from "../../services/cards"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function renderDeckPage(deckId: string) {
  render(
    <MemoryRouter initialEntries={[`/decks/${deckId}`]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/decks/:deckId" element={<DeckPage />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("DeckPage", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("shows the deck once it loads", async () => {
    const deck = await createDeck("Kanji deck")
    renderDeckPage(deck.id)

    await waitFor(() => {
      expect(screen.getByText("Kanji deck")).toBeInTheDocument()
    })
    expect(screen.queryByText(/デッキが見つかりません/)).toBeNull()
  })

  it("shows a not-found message for a deck id that doesn't exist, instead of loading forever", async () => {
    renderDeckPage("missing-deck-id")

    await waitFor(() => {
      expect(screen.getByText(/デッキが見つかりません/)).toBeInTheDocument()
    })
  })

  it("shows an error and stays on the page when deleting the deck fails", async () => {
    const deck = await createDeck("Kanji deck")
    const user = userEvent.setup()
    const deleteSpy = vi
      .spyOn(decksService, "deleteDeck")
      .mockRejectedValueOnce(new Error("削除に失敗しました。"))

    renderDeckPage(deck.id)
    await waitFor(() => {
      expect(screen.getByText("Kanji deck")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "デッキを削除" }))
    await user.click(screen.getByRole("button", { name: "削除" }))

    await waitFor(() => {
      expect(screen.getByText("削除に失敗しました。")).toBeInTheDocument()
    })
    expect(screen.getByText("Kanji deck")).toBeInTheDocument()

    deleteSpy.mockRestore()
  })

  it("clears a card's leech flag when its badge is clicked", async () => {
    const deck = await createDeck("Kanji deck")
    const card = await createVocabularyCard(deck.id, {
      wordJa: "保険",
      reading: "ほけん",
      definitionsEn: [],
      images: [],
      exampleSentences: [],
    })
    await markLeech(card.id, "vocab_type_reading")
    const user = userEvent.setup()

    renderDeckPage(deck.id)
    const badge = await screen.findByRole("button", { name: "リーチを解除" })

    await user.click(badge)

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "リーチを解除" }),
      ).not.toBeInTheDocument()
    })
    expect(
      (await loadSchedulingRow(card.id, "vocab_type_reading"))?.isLeech,
    ).toBe(false)
  })
})

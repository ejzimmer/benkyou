import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { DeckPage } from "./DeckPage"
import { resetDatabase } from "../../test/db"
import { createDeck } from "../../services/decks"

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
})

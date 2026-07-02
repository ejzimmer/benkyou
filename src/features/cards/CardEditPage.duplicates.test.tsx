import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"
import { defaultVocabulary } from "../../services/cards"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function renderNewCardPage() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/cards/new"]}>
      <AuthProvider>
        <Routes>
          <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
          <Route path="/decks/:deckId" element={<div>Deck page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("CardEditPage duplicate warning", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("warns about duplicate Japanese text across decks without blocking save", async () => {
    await db.cards.put({
      id: "existing-card",
      deckId: "deck-2",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫", definitionsEn: ["cat"] },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderNewCardPage()

    await user.type(screen.getByLabelText(/japanese word/i), "猫")

    expect(
      await screen.findByText(
        /same Japanese word, including in another deck.*still save/i,
      ),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText(/meaning \(one per line\)/i), "cat")
    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(async () => {
      const cards = await db.cards.toArray()
      expect(cards).toHaveLength(2)
      expect(
        cards.some(
          (card) =>
            card.deckId === "deck-1" &&
            card.kind === "vocabulary" &&
            card.content.wordJa === "猫",
        ),
      ).toBe(true)
    })
  })
})

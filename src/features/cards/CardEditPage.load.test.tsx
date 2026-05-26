import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
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

describe("CardEditPage load existing", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("fills vocabulary card from IndexedDB", async () => {
    const card = {
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary" as const,
      content: { ...defaultVocabulary(), wordJa: "猫", definitionsEn: ["cat"] },
      updatedAt: Date.now(),
    }
    await db.cards.put(card)

    render(
      <MemoryRouter initialEntries={["/decks/deck-1/cards/card-1"]}>
        <AuthProvider>
          <Routes>
            <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
            <Route
              path="/decks/:deckId/cards/:cardId"
              element={<CardEditPage />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("猫")).toBeInTheDocument()
    })
    expect(screen.queryByText(/card not found/i)).toBeNull()
  })

  it("shows not found when card belongs to another deck", async () => {
    await db.cards.put({
      id: "card-1",
      deckId: "deck-other",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫" },
      updatedAt: Date.now(),
    })

    render(
      <MemoryRouter initialEntries={["/decks/deck-1/cards/card-1"]}>
        <AuthProvider>
          <Routes>
            <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
            <Route
              path="/decks/:deckId/cards/:cardId"
              element={<CardEditPage />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/card not found/i)).toBeInTheDocument()
    })
  })
})

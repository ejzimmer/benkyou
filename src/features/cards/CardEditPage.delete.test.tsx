import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
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

function renderExistingCardPage() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/cards/card-1"]}>
      <AuthProvider>
        <Routes>
          <Route path="/decks/:deckId" element={<div>Deck page</div>} />
          <Route
            path="/decks/:deckId/cards/:cardId"
            element={<CardEditPage />}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("CardEditPage delete card", () => {
  beforeEach(async () => {
    await resetDatabase()
    await db.cards.put({
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      content: { ...defaultVocabulary(), wordJa: "猫", definitionsEn: ["cat"] },
      updatedAt: Date.now(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not show a delete button for a new card", async () => {
    render(
      <MemoryRouter initialEntries={["/decks/deck-1/cards/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole("button", { name: /delete card/i }),
    ).not.toBeInTheDocument()
  })

  it("deletes the card and navigates back after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    renderExistingCardPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue("猫")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /delete card/i }))

    expect(window.confirm).toHaveBeenCalledWith("Delete this card?")
    expect(await screen.findByText("Deck page")).toBeInTheDocument()

    await waitFor(async () => {
      expect(await db.cards.get("card-1")).toBeUndefined()
    })
  })

  it("keeps the card when the confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()
    renderExistingCardPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue("猫")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /delete card/i }))

    expect(screen.queryByText("Deck page")).not.toBeInTheDocument()
    expect(await db.cards.get("card-1")).toBeDefined()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { db } from "../../lib/db/schema"
import { resetDatabase } from "../../test/db"
import { CardEditPage } from "./CardEditPage"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function renderNewCardPage() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/cards/new"]}>
      <AuthProvider>
        <SyncProvider>
        <Routes>
          <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
          <Route path="/decks/:deckId" element={<div>Deck page</div>} />
        </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("CardEditPage create flow", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("resets the new-card form instead of returning to the deck", async () => {
    const user = userEvent.setup()
    renderNewCardPage()

    await user.type(screen.getByLabelText("日本語で"), "猫")
    await user.type(screen.getByRole("textbox", { name: /^reading$/i }), "ねこ")
    await user.type(screen.getByLabelText("意味"), "cat")
    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(async () => {
      expect(await db.cards.count()).toBe(1)
    })
    const [card] = await db.cards.toArray()
    if (!card || card.kind !== "vocabulary") {
      throw new Error("Expected a saved vocabulary card")
    }
    expect(card.content.wordJa).toBe("猫")

    expect(screen.queryByText("Deck page")).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "新規カード" }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText("日本語で")).toHaveValue("")
    })
    expect(screen.getByRole("textbox", { name: /^reading$/i })).toHaveValue("")
    expect(screen.getByLabelText("意味")).toHaveValue("")
  })
})

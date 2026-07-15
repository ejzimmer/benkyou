import { StrictMode } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

describe("CardEditPage under StrictMode", () => {
  it("saves the auto-seeded furigana reading for a new vocab word", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/decks/deck-1/cards/new"]}>
          <AuthProvider>
            <Routes>
              <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </StrictMode>,
    )

    const wordInput = await screen.findByLabelText(/japanese word/i)
    await user.type(wordInput, "猫")

    const readingInput = screen.getByLabelText(/reading \/ pronunciation/i)
    await user.type(readingInput, "ねこ")

    const furiganaTa = screen.getByRole("textbox", { name: /kanji to reading map/i })
    await waitFor(() => {
      expect(furiganaTa).toHaveValue("猫=ねこ")
    })

    const meaningTa = screen.getByLabelText(/meaning/i)
    await user.type(meaningTa, "cat")

    const saveBtn = screen.getByRole("button", { name: /save/i })
    await user.click(saveBtn)

    await waitFor(async () => {
      const cards = await db.cards.toArray()
      expect(cards.length).toBe(1)
      expect(cards[0].content.readings).toEqual({ 猫: "ねこ" })
    })
  })
})

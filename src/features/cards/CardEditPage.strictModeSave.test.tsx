import { StrictMode } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

describe("CardEditPage under StrictMode", () => {
  it("saves the reading and furigana typed into the combined Readings field for a new vocab word", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/decks/deck-1/cards/new"]}>
          <AuthProvider>
            <SyncProvider>
            <Routes>
              <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
            </Routes>
            </SyncProvider>
          </AuthProvider>
        </MemoryRouter>
      </StrictMode>,
    )

    const wordInput = await screen.findByLabelText("日本語で")
    await user.type(wordInput, "猫")

    const readingsTa = screen.getByRole("textbox", { name: /^readings$/i })
    await user.type(readingsTa, "ねこ\n猫=ねこ")

    await waitFor(() => {
      expect(readingsTa).toHaveValue("ねこ\n猫=ねこ")
    })

    const meaningTa = screen.getByLabelText("意味")
    await user.type(meaningTa, "cat")

    const saveBtn = screen.getByRole("button", { name: "保存" })
    await user.click(saveBtn)

    await waitFor(async () => {
      const cards = await db.cards.toArray()
      expect(cards.length).toBe(1)
      const [card] = cards
      if (card?.kind !== "vocabulary") {
        throw new Error("Expected a saved vocabulary card")
      }
      expect(card.content.reading).toBe("ねこ")
      expect(card.content.readings).toEqual({ 猫: "ねこ" })
    })
  })
})

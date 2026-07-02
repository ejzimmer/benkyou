import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
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

function renderEditPage(deckId: string, cardId: string) {
  render(
    <MemoryRouter initialEntries={[`/decks/${deckId}/cards/${cardId}`]}>
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
        synonymsJa: ["猫"],
      },
      updatedAt: Date.now(),
    })

    const user = userEvent.setup()
    renderEditPage("deck-1", "card-1")

    await waitFor(() => {
      expect(screen.getByDisplayValue("猫")).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole("button", { name: /find duplicate cards/i }),
    )

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/子猫/)).toBeInTheDocument()

    await user.click(
      within(dialog).getByRole("button", { name: /merge into this card/i }),
    )

    await waitFor(() => {
      expect(
        within(dialog).queryByText(/子猫/),
      ).not.toBeInTheDocument()
    })
    expect(
      within(dialog).getByText(/no other cards contain this word/i),
    ).toBeInTheDocument()

    expect(screen.getByLabelText(/meaning \(one per line\)/i)).toHaveValue(
      "cat\nkitten (contains 猫)",
    )
    expect(screen.getByLabelText(/synonyms in japanese/i)).toHaveValue("猫")

    await waitFor(async () => {
      expect(await db.cards.get("card-2")).toBeUndefined()
      const merged = await db.cards.get("card-1")
      expect(merged?.kind).toBe("vocabulary")
      if (merged?.kind !== "vocabulary") return
      expect(merged.content.definitionsEn).toEqual([
        "cat",
        "kitten (contains 猫)",
      ])
      expect(merged.content.synonymsJa).toEqual(["猫"])
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
      screen.getByRole("button", { name: /find duplicate cards/i }),
    )

    expect(
      await screen.findByText(/no other cards contain this word/i),
    ).toBeInTheDocument()
  })
})

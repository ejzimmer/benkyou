import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { CardEditPage } from "./CardEditPage"
import { resetDatabase } from "../../test/db"
import { db } from "../../lib/db/schema"
import { defaultGrammar, defaultVocabulary } from "../../services/cards"

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

  it("converts an existing fill-in-the-blank card to vocabulary on save", async () => {
    const user = userEvent.setup()
    await db.cards.put({
      id: "card-1",
      deckId: "deck-1",
      kind: "grammar",
      content: {
        ...defaultGrammar(),
        sentenceWithGap: "私は___です",
        construction: "学生",
        constructionReading: "がくせい",
        translationEn: "student",
        readings: { 学生: "がくせい" },
        images: ["image-1"],
        synonymsJa: ["生徒"],
      },
      updatedAt: Date.now(),
    })

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

    await waitFor(() => {
      expect(screen.getByDisplayValue("私は___です")).toBeInTheDocument()
    })
    await user.selectOptions(screen.getByLabelText(/type/i), "vocabulary")

    expect(screen.getByLabelText(/japanese word/i)).toHaveValue("学生")
    expect(screen.getByRole("textbox", { name: /^reading$/i })).toHaveValue(
      "がくせい",
    )
    expect(screen.getByLabelText(/meaning \(one per line\)/i)).toHaveValue("student")
    expect(
      screen.getByLabelText(/example sentences \(one per line\)/i),
    ).toHaveValue("私は___です")
    expect(screen.getByLabelText(/synonyms in japanese/i)).toHaveValue("生徒")

    await user.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(async () => {
      const card = await db.cards.get("card-1")
      expect(card?.kind).toBe("vocabulary")
      if (card?.kind !== "vocabulary") return
      expect(card.content.wordJa).toBe("学生")
      expect(card.content.reading).toBe("がくせい")
      expect(card.content.definitionsEn).toEqual(["student"])
      expect(card.content.exampleSentences).toEqual(["私は___です"])
      expect(card.content.images).toEqual(["image-1"])
      expect(card.content.synonymsJa).toEqual(["生徒"])
    })
  })

  it("keeps an in-progress type change when the card row is rewritten in the background (e.g. by sync)", async () => {
    const user = userEvent.setup()
    const original = {
      id: "card-1",
      deckId: "deck-1",
      kind: "grammar" as const,
      content: {
        ...defaultGrammar(),
        sentenceWithGap: "私は___です",
        construction: "学生",
        translationEn: "student",
      },
      updatedAt: Date.now(),
    }
    await db.cards.put(original)

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

    await waitFor(() => {
      expect(screen.getByDisplayValue("私は___です")).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText(/type/i), "vocabulary")
    expect(screen.getByLabelText(/type/i)).toHaveValue("vocabulary")

    // Simulate a background write to this exact row (e.g. a no-op sync pass)
    // happening while the user is still mid-edit.
    await db.cards.put({ ...original, updatedAt: Date.now() + 1 })

    // Give the live query time to re-emit and the hydration effect to run,
    // then confirm the in-progress type change wasn't reset back to "grammar".
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(screen.getByLabelText(/type/i)).toHaveValue("vocabulary")
  })
})

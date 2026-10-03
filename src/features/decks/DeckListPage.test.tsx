import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { DeckListPage } from "./DeckListPage"
import { resetDatabase } from "../../test/db"
import { createDeck } from "../../services/decks"
import { createVocabularyCard } from "../../services/cards"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function renderDeckList() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/" element={<DeckListPage />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function vocab(wordJa: string, definitionsEn: string[]) {
  return { wordJa, reading: "", definitionsEn, images: [], exampleSentences: [] }
}

describe("DeckListPage search", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("finds matching cards across every deck, labelled with their deck", async () => {
    const deckA = await createDeck("Deck A")
    const deckB = await createDeck("Deck B")
    const hoken = await createVocabularyCard(deckA.id, vocab("保険", ["insurance"]))
    const hoshou = await createVocabularyCard(deckB.id, vocab("保証", ["guarantee"]))
    await createVocabularyCard(deckB.id, vocab("猫", ["cat"]))
    const user = userEvent.setup()
    renderDeckList()

    await user.type(screen.getByRole("searchbox", { name: "すべてのデッキからカードを探す" }), "保")

    const hokenLink = await screen.findByRole("link", { name: "保険" })
    expect(hokenLink).toHaveAttribute("href", `/decks/${deckA.id}/cards/${hoken.id}`)
    const hoshouLink = screen.getByRole("link", { name: "保証" })
    expect(hoshouLink).toHaveAttribute("href", `/decks/${deckB.id}/cards/${hoshou.id}`)
    expect(within(hoshouLink.closest("li")!).getByRole("link", { name: "Deck B" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "猫" })).toBeNull()
  })

  it("matches English definitions case-insensitively", async () => {
    const deck = await createDeck("Deck A")
    await createVocabularyCard(deck.id, vocab("猫", ["Cat"]))
    const user = userEvent.setup()
    renderDeckList()

    await user.type(screen.getByRole("searchbox"), "cat")

    expect(await screen.findByRole("link", { name: "猫" })).toBeInTheDocument()
  })

  it("says nothing was found, and shows the decks again once cleared", async () => {
    await createDeck("Deck A")
    const user = userEvent.setup()
    renderDeckList()
    await screen.findByRole("link", { name: "Deck A" })

    const search = screen.getByRole("searchbox")
    await user.type(search, "xyz")
    expect(await screen.findByText("カードが見つかりません。")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Deck A" })).toBeNull()

    await user.clear(search)
    expect(await screen.findByRole("link", { name: "Deck A" })).toBeInTheDocument()
  })
})

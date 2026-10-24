import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { CollectionPage } from "./CollectionPage"
import { NewCardRedirect } from "./NewCardRedirect"
import { resetDatabase } from "../../test/db"
import { createDeck, DEFAULT_DECK_NAME } from "../../services/decks"
import { createVocabularyCard } from "../../services/cards"
import { db } from "../../lib/db/schema"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

function vocab(wordJa: string) {
  return { wordJa, definitionsEn: ["x"], images: [], exampleSentences: [] }
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/" element={<CollectionPage />} />
            <Route path="/cards/new" element={<NewCardRedirect />} />
            <Route path="/decks/:deckId/cards/new" element={<p>Add form</p>} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("CollectionPage", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("lists cards from every deck in one list, filtered by the search box", async () => {
    const a = await createDeck("A")
    const b = await createDeck("B")
    await createVocabularyCard(a.id, vocab("猫"))
    await createVocabularyCard(b.id, vocab("犬"))
    renderAt("/")

    await waitFor(() => expect(screen.getByText("猫")).toBeInTheDocument())
    expect(screen.getByText("犬")).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: /^\d+枚を復習する$/ })).toBeInTheDocument()

    await userEvent.type(screen.getByRole("searchbox", { name: "カードを探す" }), "猫")
    await waitFor(() => expect(screen.queryByText("犬")).toBeNull())
    expect(screen.getByText("猫")).toBeInTheDocument()
  })

  it("adds cards to a single default deck, creating it only once when there are none", async () => {
    renderAt("/cards/new")

    await waitFor(() => expect(screen.getByText("Add form")).toBeInTheDocument())
    const decks = await db.decks.toArray()
    expect(decks.map((d) => d.name)).toEqual([DEFAULT_DECK_NAME])
  })
})

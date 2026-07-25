import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { CardEditPage } from "./CardEditPage"

vi.mock("../../lib/firebase", () => ({
  getFirebaseApp: () => null,
  getFirestoreDb: () => null,
  isFirebaseConfigured: () => false,
}))

vi.mock("../../lib/sync/firestoreSync", () => ({
  upsertDeckRemote: vi.fn(),
  upsertCardRemote: vi.fn(),
  upsertSchedulingRemote: vi.fn(),
}))

function wrapVocab() {
  return (
    <MemoryRouter initialEntries={["/decks/d1/cards/new?vocab=1"]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

function wrapGrammar() {
  return (
    <MemoryRouter initialEntries={["/decks/d1/cards/new?vocab=0"]}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe("CardEditPage Fill in kanji", () => {
  it("adds every kanji from the vocab word and example sentences as blank furigana lines", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText("日本語で"), "結論に至る")
    await user.type(screen.getByLabelText("例文"), "彼は結論に至った")
    await user.click(screen.getByRole("button", { name: /fill in kanji/i }))

    expect(screen.getByRole("textbox", { name: /^furigana$/i })).toHaveValue(
      "結=\n論=\n至=\n彼=",
    )
  })

  it("does not duplicate a kanji already covered by an existing furigana entry", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText("日本語で"), "結論に至る")
    await user.type(screen.getByRole("textbox", { name: /^furigana$/i }), "結論=けつろん")
    await user.click(screen.getByRole("button", { name: /fill in kanji/i }))

    expect(screen.getByRole("textbox", { name: /^furigana$/i })).toHaveValue(
      "結論=けつろん\n至=",
    )
  })

  it("adds every kanji from the grammar construction and sentence as blank furigana lines", async () => {
    const user = userEvent.setup()
    render(wrapGrammar())

    await user.type(
      screen.getByLabelText("問題文"),
      "彼は___に至った",
    )
    await user.type(screen.getByLabelText("答え"), "結論")
    await user.click(screen.getByRole("button", { name: /fill in kanji/i }))

    expect(screen.getByRole("textbox", { name: /^furigana$/i })).toHaveValue(
      "結=\n論=\n彼=\n至=",
    )
  })
})

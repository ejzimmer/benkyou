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

describe("CardEditPage vocab Reading / Furigana fields", () => {
  it("has separate Reading and Furigana fields, not a single combined Readings field", async () => {
    render(wrapVocab())

    expect(
      screen.getByRole("textbox", { name: /^読み方$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: /^ふりがな$/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: /^readings$/i })).toBeNull()
  })

  it("treats the Reading field as the word's tested reading, independent of furigana", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText("日本語で"), "猫")
    await user.type(screen.getByRole("textbox", { name: /^読み方$/ }), "ねこ")

    expect(screen.getByRole("textbox", { name: /^読み方$/ })).toHaveValue("ねこ")
    expect(screen.getByRole("textbox", { name: /^ふりがな$/ })).toHaveValue("")
  })

  it("treats kanjiPhrase=reading lines in Furigana as separate from the tested reading", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText("日本語で"), "結論に至る")
    await user.type(
      screen.getByRole("textbox", { name: /^読み方$/ }),
      "けつろんにいたる",
    )
    await user.type(screen.getByRole("textbox", { name: /^ふりがな$/ }), "至=いた")

    expect(screen.getByRole("textbox", { name: /^読み方$/ })).toHaveValue(
      "けつろんにいたる",
    )
    expect(screen.getByRole("textbox", { name: /^ふりがな$/ })).toHaveValue("至=いた")
  })

  it("clears the Reading field when the word becomes kana-only, keeping furigana entries", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    const wordInput = screen.getByLabelText("日本語で")
    await user.type(wordInput, "猫")
    await user.type(screen.getByRole("textbox", { name: /^読み方$/ }), "ねこ")
    await user.type(screen.getByRole("textbox", { name: /^ふりがな$/ }), "猫=ねこ")

    await user.clear(wordInput)
    await user.type(wordInput, "ねこちゃん")

    // The word is now kana-only, so the tested reading no longer applies —
    // the furigana entry for 猫 is stale too (猫 isn't in the word anymore)
    // but that's left to the author to clean up, same as any unrelated hand
    // authored furigana entry.
    expect(screen.getByRole("textbox", { name: /^読み方$/ })).toHaveValue("")
    expect(screen.getByRole("textbox", { name: /^ふりがな$/ })).toHaveValue("猫=ねこ")
  })
})

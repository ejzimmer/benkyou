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

describe("CardEditPage vocab combined Readings field", () => {
  it("has a single combined Readings field, not separate reading/furigana fields", async () => {
    render(wrapVocab())

    expect(
      screen.getByRole("textbox", { name: /^readings$/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: /^reading$/i })).toBeNull()
    expect(
      screen.queryByRole("textbox", { name: /kanji to reading map/i }),
    ).toBeNull()
  })

  it("treats a line with no = as the word's tested reading", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText(/japanese word/i), "猫")
    await user.type(screen.getByRole("textbox", { name: /^readings$/i }), "ねこ")

    expect(
      screen.getByRole("textbox", { name: /^readings$/i }),
    ).toHaveValue("ねこ")
  })

  it("treats kanjiPhrase=reading lines as furigana, combined in the same field as the tested reading", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText(/japanese word/i), "結論に至る")
    const readingsTa = screen.getByRole("textbox", { name: /^readings$/i })
    await user.type(readingsTa, "けつろんにいたる\n至=いた")

    expect(readingsTa).toHaveValue("けつろんにいたる\n至=いた")
  })

  it("drops the tested reading line from the Readings field when the word becomes kana-only, keeping furigana entries", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    const wordInput = screen.getByLabelText(/japanese word/i)
    await user.type(wordInput, "猫")
    const readingsTa = screen.getByRole("textbox", { name: /^readings$/i })
    await user.type(readingsTa, "ねこ\n猫=ねこ")
    expect(readingsTa).toHaveValue("ねこ\n猫=ねこ")

    await user.clear(wordInput)
    await user.type(wordInput, "ねこちゃん")

    // The word is now kana-only, so the tested "ねこ" reading line no longer
    // applies and must not linger in the field the author can still see —
    // the furigana entry for 猫 is stale too (猫 isn't in the word anymore)
    // but that's left to the author to clean up, same as any unrelated hand
    // authored furigana entry.
    expect(readingsTa).toHaveValue("猫=ねこ")
  })
})

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

describe("CardEditPage vocab furigana auto-seed", () => {
  it("seeds the furigana map from the whole-word reading as you type it", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText(/japanese word/i), "猫")
    await user.type(screen.getByRole("textbox", { name: /^reading$/i }), "ねこ")

    expect(
      screen.getByRole("textbox", { name: /kanji to reading map/i }),
    ).toHaveValue("猫=ねこ")
  })

  it("lets furigana be edited independently without touching the reading field", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText(/japanese word/i), "猫")
    await user.type(screen.getByRole("textbox", { name: /^reading$/i }), "ねこ")

    const furiganaTa = screen.getByRole("textbox", {
      name: /kanji to reading map/i,
    })
    await user.clear(furiganaTa)
    await user.type(furiganaTa, "猫=ネコ")

    expect(furiganaTa).toHaveValue("猫=ネコ")
    expect(screen.getByRole("textbox", { name: /^reading$/i })).toHaveValue(
      "ねこ",
    )
  })

  it("does not overwrite a manually-edited furigana entry on a later reading edit", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText(/japanese word/i), "猫")
    const readingInput = screen.getByRole("textbox", { name: /^reading$/i })
    await user.type(readingInput, "ねこ")

    const furiganaTa = screen.getByRole("textbox", {
      name: /kanji to reading map/i,
    })
    await user.clear(furiganaTa)
    await user.type(furiganaTa, "猫=ネコ")

    // Editing the reading again should not clobber the hand-edited furigana.
    await user.type(readingInput, "!")

    expect(furiganaTa).toHaveValue("猫=ネコ")
  })

  it("seeds kanji-only furigana per cluster once the reading field has multiple = entries", async () => {
    const user = userEvent.setup()
    render(wrapVocab())

    await user.type(screen.getByLabelText(/japanese word/i), "結論に至る")
    await user.type(
      screen.getByRole("textbox", { name: /^reading$/i }),
      "結論=けつろん\n至る=いたる",
    )

    expect(
      screen.getByRole("textbox", { name: /kanji to reading map/i }),
    ).toHaveValue("結論=けつろん\n至=いた")
  })
})

describe("CardEditPage grammar furigana auto-seed", () => {
  it("seeds furigana from the construction reading, decoupled from the literal construction text", async () => {
    const user = userEvent.setup()
    render(wrapGrammar())

    await user.type(
      screen.getByLabelText(/construction \(fills gap\)/i),
      "芳しく",
    )
    await user.type(
      screen.getByRole("textbox", { name: /^construction reading$/i }),
      "かんばしい",
    )

    // 芳しく has a 2-character trailing okurigana suffix (しく); stripping
    // that many characters from the tested reading's end (かんばしい) — a
    // best-effort approximation the author can correct — lands on 芳=かんば.
    expect(
      screen.getByRole("textbox", { name: /kanji to reading map/i }),
    ).toHaveValue("芳=かんば")
  })

  it("seeds per-cluster furigana once the construction reading field has multiple = entries", async () => {
    const user = userEvent.setup()
    render(wrapGrammar())

    await user.type(
      screen.getByLabelText(/construction \(fills gap\)/i),
      "結論に至る",
    )
    await user.type(
      screen.getByRole("textbox", { name: /^construction reading$/i }),
      "結論=けつろん\n至る=いたる",
    )

    expect(
      screen.getByRole("textbox", { name: /kanji to reading map/i }),
    ).toHaveValue("結論=けつろん\n至=いた")
  })
})

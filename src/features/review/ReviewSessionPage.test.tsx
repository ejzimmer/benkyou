import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { ReviewSessionPage } from "./ReviewSessionPage"
import { resetDatabase } from "../../test/db"
import { createDeck } from "../../services/decks"
import { createVocabularyCard } from "../../services/cards"

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

describe("ReviewSessionPage", () => {
  it("shows a due card and advances after grading", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      null,
    )

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeEnabled()
    })

    await user.click(screen.getByRole("button", { name: /show answer/i }))
    expect(await screen.findByRole("button", { name: /^correct$/i })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^correct$/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/2 left/i)).toBeInTheDocument()
  })

  it("after incorrect, does not flash next card answer during queue rotation gap", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      null,
    )
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "犬",
        reading: "いぬ",
        definitionsEn: ["dog"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
      null,
    )

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeEnabled()
    })

    await user.click(screen.getByRole("button", { name: /show answer/i }))
    await user.click(screen.getByRole("button", { name: /^incorrect$/i }))

    expect(
      screen.queryByRole("heading", { name: /^answer$/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/next card/i)).toBeInTheDocument()
  })
})

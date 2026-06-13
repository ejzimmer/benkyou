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
    const deck = await createDeck("T", null)
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
    const deck = await createDeck("T", null)
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

    await waitFor(() => {
      expect(screen.getByText(/next card/i)).toBeInTheDocument()
    })
    expect(
      screen.queryByRole("heading", { name: /^answer$/i }),
    ).not.toBeInTheDocument()
  })

  it("keeps the question visible when the answer is shown", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T", null)
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: [""],
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

    expect(screen.getByText("猫")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /show answer/i }))

    expect(await screen.findByRole("button", { name: /^correct$/i })).toBeInTheDocument()
    expect(screen.getByText("猫")).toBeInTheDocument()
    expect(
      document.querySelector('[data-reading-diff-line="correct"]'),
    ).toHaveTextContent("ねこ")
  })

  it("keeps the question visible after undo last judgement reopens the answer", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T", null)
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: [""],
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
    await user.click(screen.getByRole("button", { name: /^correct$/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /undo last judgement/i })).toBeEnabled()
    })

    await user.click(screen.getByRole("button", { name: /undo last judgement/i }))

    expect(await screen.findByRole("button", { name: /^correct$/i })).toBeInTheDocument()
    expect(screen.getByText("猫")).toBeInTheDocument()
    expect(
      document.querySelector('[data-reading-diff-line="correct"]'),
    ).toHaveTextContent("ねこ")
  })

  it("reveals the aligned reading diff for an incorrect hiragana answer", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("Reading", null)
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "瞬間",
        reading: "しゅんかん",
        definitionsEn: [""],
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

    const input = await screen.findByPlaceholderText("ひらがなで")
    await user.type(input, "しゅかん{Enter}")

    const comparison = await screen.findByRole("group", {
      name: /hiragana answer comparison/i,
    })
    const correctLine = comparison.querySelector(
      '[data-reading-diff-line="correct"]',
    )
    const typedLine = comparison.querySelector('[data-reading-diff-line="yours"]')

    expect(screen.getByText("瞬間")).toBeInTheDocument()
    expect(correctLine).toHaveTextContent("しゅんかん")
    expect(typedLine).toHaveTextContent("しゅ-かん")
    expect(screen.getByRole("button", { name: /^incorrect$/i })).toHaveFocus()
  })
})

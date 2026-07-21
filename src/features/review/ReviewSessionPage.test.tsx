import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../lib/auth/AuthContext"
import { SyncProvider } from "../../lib/sync/SyncContext"
import { ReviewSessionPage } from "./ReviewSessionPage"
import { CardEditPage } from "../cards/CardEditPage"
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
  it("shows a plain empty state, not the completion screen, when nothing was ever due", async () => {
    await resetDatabase()
    await createDeck("T")

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

    expect(await screen.findByText(/nothing due right now/i)).toBeInTheDocument()
    expect(screen.queryByText("全カードやり終わった!")).not.toBeInTheDocument()
  })

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
    expect(screen.getByText(/2 remaining/i)).toBeInTheDocument()
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
      expect(screen.getByText("次。。。")).toBeInTheDocument()
    })
    expect(
      screen.queryByRole("heading", { name: /^answer$/i }),
    ).not.toBeInTheDocument()
  })

  it("returns from card edit to the same review card and mode", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    const firstCard = await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    )
    const secondCard = await createVocabularyCard(
      deck.id,
      {
        wordJa: "犬",
        reading: "いぬ",
        definitionsEn: ["dog"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    )

    render(
      <MemoryRouter
        initialEntries={[
          `/review?resumeCardId=${secondCard.id}&resumeModeId=vocab_oral_en`,
        ]}
      >
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
              <Route
                path="/decks/:deckId/cards/:cardId"
                element={<CardEditPage />}
              />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeEnabled()
    })

    const editLinkBefore = screen.getByRole("link", { name: /edit card/i })
    expect(editLinkBefore).toHaveAttribute(
      "href",
      expect.stringContaining(`/cards/${secondCard.id}`),
    )
    expect(editLinkBefore).not.toHaveAttribute(
      "href",
      expect.stringContaining(`/cards/${firstCard.id}`),
    )
    const hrefBefore = editLinkBefore.getAttribute("href")

    await user.click(editLinkBefore)
    await user.click(await screen.findByRole("link", { name: /back/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeEnabled()
    })

    const editLinkAfter = screen.getByRole("link", { name: /edit card/i })
    expect(editLinkAfter.getAttribute("href")).toBe(hrefBefore)
  })

  it("keeps a typed but unrevealed answer after returning from card edit", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "保険",
        reading: "ほけん",
        definitionsEn: [""],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    )

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
              <Route
                path="/decks/:deckId/cards/:cardId"
                element={<CardEditPage />}
              />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const input = await screen.findByLabelText(/ひらがなで/)
    await user.type(input, "ほけ")

    await user.click(screen.getByRole("link", { name: /edit card/i }))
    await user.click(await screen.findByRole("link", { name: /back/i }))

    const restoredInput = await screen.findByLabelText(/ひらがなで/)
    expect(restoredInput).toHaveValue("ほけ")
    expect(
      screen.queryByRole("button", { name: /^correct$/i }),
    ).not.toBeInTheDocument()
  })

  it("keeps the revealed answer showing after returning from card edit", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "保険",
        reading: "ほけん",
        definitionsEn: [""],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    )

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
              <Route
                path="/decks/:deckId/cards/:cardId"
                element={<CardEditPage />}
              />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const input = await screen.findByLabelText(/ひらがなで/)
    await user.type(input, "ほけ{Enter}")
    expect(
      await screen.findByRole("button", { name: /^correct$/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: /edit card/i }))
    await user.click(await screen.findByRole("link", { name: /back/i }))

    expect(
      await screen.findByRole("button", { name: /^correct$/i }),
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-reading-diff-line="yours"]')?.textContent,
    ).toContain("ほけ")
  })

  it("keeps the question visible when the answer is shown", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
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
    const deck = await createDeck("T")
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

    // Grading is async (it writes the undo record before the queue empties).
    // Wait for the queue to empty so the undo record is committed before we
    // undo — otherwise undo can race the grade and find no record.
    await screen.findByText("全カードやり終わった!")

    await user.click(screen.getByRole("button", { name: /undo last judgement/i }))

    expect(
      await screen.findByRole("button", { name: /^correct$/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("猫")).toBeInTheDocument()
    expect(
      document.querySelector('[data-reading-diff-line="correct"]'),
    ).toHaveTextContent("ねこ")
  })

  it("restores the entered answer after undoing the last judgement", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    await createVocabularyCard(
      deck.id,
      {
        wordJa: "保険",
        reading: "ほけん",
        definitionsEn: [""],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
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

    // Enter a wrong reading (missing ん), reveal, and mark it incorrect.
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "ほけ" } })
    fireEvent.keyDown(input, { key: "Enter" })
    await user.click(await screen.findByRole("button", { name: /^incorrect$/i }))

    // Wait for the grade to land (the prompt returns) so the undo record is
    // committed before we undo — otherwise undo can race the grade.
    await screen.findByRole("button", { name: /show answer/i })

    await user.click(
      screen.getByRole("button", { name: /undo last judgement/i }),
    )

    // The answer screen reopens showing what was entered, not a blank answer.
    expect(await screen.findByText("Your answer")).toBeInTheDocument()
    expect(
      document.querySelector('[data-reading-diff-line="yours"]')?.textContent,
    ).toContain("ほけ")
  })

  it("reveals the aligned reading diff for an incorrect hiragana answer", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("Reading")
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

    const input = await screen.findByLabelText(/ひらがなで/)
    await user.type(input, "しゅかん{Enter}")

    const comparison = await screen.findByRole("group", {
      name: /answer comparison/i,
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

  it("blocks submitting a reading answer that contains kanji, instead of grading it", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
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

    const input = await screen.findByLabelText(/ひらがなで/)
    await user.type(input, "猫{Enter}")

    expect(
      await screen.findByText(/use hiragana only for readings/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^correct$/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
  })

  it("blocks submitting a kana-only answer for a type-the-word question whose answer has kanji", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    const card = await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    )

    render(
      <MemoryRouter
        initialEntries={[
          `/review?resumeCardId=${card.id}&resumeModeId=vocab_type_word_from_clue`,
        ]}
      >
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const input = await screen.findByLabelText("日本語で")
    await user.type(input, "ねこ{Enter}")

    expect(
      await screen.findByText(/answer uses kanji/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^correct$/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
  })

  it("blocks submitting an English answer for a type-the-word question, instead of grading it", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    const card = await createVocabularyCard(
      deck.id,
      {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    )

    render(
      <MemoryRouter
        initialEntries={[
          `/review?resumeCardId=${card.id}&resumeModeId=vocab_type_word_from_clue`,
        ]}
      >
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const input = await screen.findByLabelText("日本語で")
    await user.type(input, "cat{Enter}")

    expect(
      await screen.findByText(/type the answer in japanese/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^correct$/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
  })

  it("allows a correct answer that legitimately contains Latin script, e.g. a loanword", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    const card = await createVocabularyCard(
      deck.id,
      {
        wordJa: "Tシャツ",
        reading: "",
        definitionsEn: ["T-shirt"],
        images: [],
        exampleSentences: [],
        synonymsJa: [],
      },
    )

    render(
      <MemoryRouter
        initialEntries={[
          `/review?resumeCardId=${card.id}&resumeModeId=vocab_type_word_from_clue`,
        ]}
      >
        <AuthProvider>
          <SyncProvider>
            <Routes>
              <Route path="/review" element={<ReviewSessionPage />} />
            </Routes>
          </SyncProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const input = await screen.findByLabelText("日本語で")
    await user.type(input, "Tシャツ{Enter}")

    expect(
      screen.queryByText(/type the answer in japanese/i),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: /^correct$/i }),
    ).toBeInTheDocument()
  })

  it("clears a validation warning once the answer is corrected, including after undoing the reveal", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
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

    const input = await screen.findByLabelText(/ひらがなで/)
    await user.type(input, "猫{Enter}")
    expect(
      await screen.findByText(/use hiragana only for readings/i),
    ).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, "ねこ{Enter}")

    const correctButton = await screen.findByRole("button", { name: /^correct$/i })
    expect(
      screen.queryByText(/use hiragana only for readings/i),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /undo answer/i }))

    const reopenedInput = await screen.findByLabelText(/ひらがなで/)
    expect(reopenedInput).toHaveValue("ねこ")
    expect(reopenedInput).toHaveFocus()
    expect(
      screen.queryByText(/use hiragana only for readings/i),
    ).not.toBeInTheDocument()
    // The answer panel stays mounted (so revealing never resizes the card)
    // but must go back to being non-interactive once the reveal is undone.
    expect(correctButton.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(correctButton.closest("[inert]")).not.toBeNull()
  })
})

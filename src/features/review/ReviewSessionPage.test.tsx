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
import {
  createVocabularyCard,
  loadSchedulingRow,
  updateSchedulingRow,
} from "../../services/cards"
import { deserializeFsrs, serializeFsrs } from "../../lib/srs/schedule"
import { db } from "../../lib/db/schema"

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
    expect(screen.getByText("残り2枚")).toBeInTheDocument()
  })

  it("splits the header count into remaining vs needs-correction after an incorrect answer", async () => {
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
    expect(screen.getByText("残り3枚")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /show answer/i }))
    await user.click(await screen.findByRole("button", { name: /^incorrect$/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
    })
    // Still 3 cards left in the queue overall, but one of them now needs a
    // correcting retry rather than being reviewed for the first time.
    expect(screen.getByText("残り2枚・やり直し1枚")).toBeInTheDocument()
  })

  it("keeps the needs-correction count across a card-edit round trip", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    for (const [word, reading] of [
      ["猫", "ねこ"],
      ["犬", "いぬ"],
      ["鳥", "とり"],
    ] as const) {
      await createVocabularyCard(deck.id, {
        wordJa: word,
        reading,
        definitionsEn: [],
        images: [],
        exampleSentences: [],
      })
    }

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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeEnabled()
    })

    await user.click(screen.getByRole("button", { name: /show answer/i }))
    await user.click(await screen.findByRole("button", { name: /^incorrect$/i }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
    })
    expect(screen.getByText("残り2枚・やり直し1枚")).toBeInTheDocument()

    // Navigating to edit a card and back remounts the page — the
    // needs-correction split must survive that, not silently reset.
    await user.click(screen.getByRole("link", { name: "カード編集" }))
    await user.click(await screen.findByRole("link", { name: /back/i }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
    })
    expect(screen.getByText("残り2枚・やり直し1枚")).toBeInTheDocument()

    // Correctly answering a card that was never marked wrong should still
    // decrement 残り, leaving やり直し untouched.
    await user.click(screen.getByRole("button", { name: /show answer/i }))
    await user.click(await screen.findByRole("button", { name: /^correct$/i }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument()
    })
    expect(screen.getByText("残り1枚・やり直し1枚")).toBeInTheDocument()
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

    const editLinkBefore = screen.getByRole("link", { name: "カード編集" })
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

    const editLinkAfter = screen.getByRole("link", { name: "カード編集" })
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

    await user.click(screen.getByRole("link", { name: "カード編集" }))
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

    await user.click(screen.getByRole("link", { name: "カード編集" }))
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

    await user.click(screen.getByRole("button", { name: "取り消す" }))

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
      screen.getByRole("button", { name: "取り消す" }),
    )

    // The answer screen reopens showing what was entered, not a blank answer.
    // The answer panel stays permanently mounted (just hidden) behind the
    // prompt, so `findByText` can resolve before the undo's async state
    // updates land — assert on the actual diff content via `waitFor` rather
    // than a synchronous check right after.
    expect(await screen.findByText("Your answer")).toBeInTheDocument()
    await waitFor(() => {
      expect(
        document.querySelector('[data-reading-diff-line="yours"]')?.textContent,
      ).toContain("ほけ")
    })
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

describe("ReviewSessionPage — leech detection", () => {
  /** A single-mode (vocab_type_reading) card whose scheduling row is
   *  pre-seeded just below the leech threshold, so one more incorrect
   *  answer in the test crosses it. */
  async function seedCardNearLeechThreshold(deckId: string) {
    const card = await createVocabularyCard(deckId, {
      wordJa: "保険",
      reading: "ほけん",
      definitionsEn: [],
      images: [],
      exampleSentences: [],
    })
    const row = await loadSchedulingRow(card.id, "vocab_type_reading")
    if (!row) throw new Error("expected a scheduling row for the seeded card")
    const fsrsCard = deserializeFsrs(row.fsrs)
    fsrsCard.state = 2 // Review — lapses only accrue from this state
    fsrsCard.lapses = 3
    fsrsCard.stability = 5
    fsrsCard.difficulty = 5
    await updateSchedulingRow({
      ...row,
      fsrs: serializeFsrs(fsrsCard),
      due: Date.now(),
    })
    return card
  }

  async function answerIncorrectlyAndOpenLeechModal(user: ReturnType<typeof userEvent.setup>) {
    const input = await screen.findByLabelText(/ひらがなで/)
    await user.type(input, "ちがう{Enter}")
    await user.click(await screen.findByRole("button", { name: /^incorrect$/i }))
    expect(await screen.findByText("リーチと判定されました")).toBeInTheDocument()
  }

  it("marks the row a leech and keeps reviewing it when 除外 is chosen", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    await seedCardNearLeechThreshold(deck.id)

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

    await answerIncorrectlyAndOpenLeechModal(user)
    await user.click(screen.getByRole("button", { name: "除外" }))

    expect(screen.queryByText("リーチと判定されました")).not.toBeInTheDocument()
    expect(await screen.findByText("リーチ")).toBeInTheDocument()
  })

  it("deletes the card entirely when 削除 is chosen", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    const card = await seedCardNearLeechThreshold(deck.id)

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

    await answerIncorrectlyAndOpenLeechModal(user)
    await user.click(screen.getByRole("button", { name: "削除" }))

    expect(screen.queryByText("リーチと判定されました")).not.toBeInTheDocument()
    expect(await screen.findByText("全カードやり終わった!")).toBeInTheDocument()
    expect(await db.cards.get(card.id)).toBeUndefined()
  })

  it("opens the card editor when 編集 is chosen", async () => {
    await resetDatabase()
    const user = userEvent.setup()
    const deck = await createDeck("T")
    await seedCardNearLeechThreshold(deck.id)

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

    await answerIncorrectlyAndOpenLeechModal(user)
    await user.click(screen.getByRole("button", { name: "編集" }))

    expect(await screen.findByDisplayValue("保険")).toBeInTheDocument()
  })
})

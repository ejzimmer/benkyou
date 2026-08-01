import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DueItem } from "../../services/review"
import { ReviewSessionAnswerPanel } from "./ReviewSessionAnswerPanel"
import { ReviewSessionPromptBody } from "./ReviewSessionPromptBody"
import type { ReviewModeId } from "../../domain/types"

vi.mock("../../ui/CardImage", () => ({
  CardImage: ({ mediaId }: { mediaId: string }) => (
    <div data-testid="card-image" data-mediaid={mediaId}>
      {mediaId}
    </div>
  ),
}))

function vocabItem(modeId: ReviewModeId): DueItem {
  return {
    card: {
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      updatedAt: 0,
      content: {
        wordJa: "猫",
        reading: "ねこ",
        definitionsEn: ["cat"],
        images: ["img-cat"],
        exampleSentences: ["猫がいます。"],
      },
    },
    modeId,
    due: 0,
    isLeech: false,
  }
}

const readingItem: DueItem = vocabItem("vocab_type_reading")
const vocabWordItem: DueItem = vocabItem("vocab_type_word_from_clue")

describe("ReviewSessionAnswerPanel", () => {
  it("shows only the correct answer for a matching hiragana answer", async () => {
    render(
      <ReviewSessionAnswerPanel
        item={readingItem}
        typed="ねこ"
        expected="ねこ"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    const answer = screen.getByRole("group", {
      name: "Answer",
    })
    const correctLabel = within(answer).getByText("Correct answer")
    const correctValue = within(answer).getByText("ねこ")

    expect(correctLabel.compareDocumentPosition(correctValue)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(correctValue).toHaveClass("reading-answer-value")
    expect(within(answer).queryByText("Your answer")).not.toBeInTheDocument()
    expect(within(answer).getAllByText("ねこ")).toHaveLength(1)
    expect(
      answer.querySelector(".reading-answer-diff-cell"),
    ).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^correct$/i })).toHaveFocus()
    })
  })

  it("aligns missing hiragana under the correct answer, then focuses Incorrect", async () => {
    render(
      <ReviewSessionAnswerPanel
        item={readingItem}
        typed="しゅかん"
        expected="しゅんかん"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    const comparison = screen.getByRole("group", {
      name: /answer comparison/i,
    })
    const correctLabel = within(comparison).getByText("Correct answer")
    const typedLabel = within(comparison).getByText("Your answer")
    const correctLine = comparison.querySelector(
      '[data-reading-diff-line="correct"]',
    )
    const typedLine = comparison.querySelector(
      '[data-reading-diff-line="yours"]',
    )

    if (!correctLine || !typedLine) {
      throw new Error("Expected aligned reading diff lines")
    }

    expect(correctLabel.compareDocumentPosition(correctLine)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(typedLabel.compareDocumentPosition(typedLine)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(correctLine).toHaveTextContent("しゅんかん")
    expect(typedLine).toHaveTextContent("しゅ-かん")
    expect(
      [...correctLine.querySelectorAll(".reading-answer-diff-cell")].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["し", "ゅ", "ん", "か", "ん"])
    expect(
      [...typedLine.querySelectorAll(".reading-answer-diff-cell")].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(["し", "ゅ", "-", "か", "ん"])
    expect(
      correctLine.querySelectorAll(".reading-answer-diff-cell")[2],
    ).toHaveClass("reading-answer-diff-missing")
    expect(
      typedLine.querySelectorAll(".reading-answer-diff-cell")[2],
    ).toHaveClass("reading-answer-diff-gap")

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^incorrect$/i })).toHaveFocus()
    })
  })
})

function grammarItem(modeId: ReviewModeId): DueItem {
  return {
    card: {
      id: "card-2",
      deckId: "deck-1",
      kind: "grammar",
      updatedAt: 0,
      content: {
        sentenceWithGap: "辞書___探しました",
        gapMarker: "___",
        construction: "で",
        translationEn: "I searched in the dictionary",
        readings: {},
        images: ["img-grammar"],
      },
    },
    modeId,
    due: 0,
    isLeech: false,
  }
}

function renderRevealedReview(item: DueItem) {
  return render(
    <>
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        revealed
        column="question"
      />
      <ReviewSessionAnswerPanel
        item={item}
        typed=""
        expected=""
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />
    </>,
  )
}

/** Visible text of an element, excluding hidden furigana `<rt>` content. */
function textWithoutRuby(el: Element | null): string {
  if (!el) return ""
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll("rt").forEach((rt) => rt.remove())
  return clone.textContent ?? ""
}

function expectBefore(first: Element, second: Element) {
  expect(
    Boolean(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  ).toBe(true)
}

describe("ReviewSessionAnswerPanel", () => {
  it("keeps the oral vocabulary question, then the meaning and images, then controls", () => {
    const { container } = renderRevealedReview(vocabItem("vocab_oral_en"))

    const prompt = container.querySelector(".prompt-main")
    const example = container.querySelector(".ruby-sentence")
    const correctButton = screen.getByRole("button", { name: /^correct$/i })
    const meaning = screen.getByText("cat")
    const image = screen.getByTestId("card-image")

    expect(prompt).not.toBeNull()
    expect(example).not.toBeNull()
    expect(textWithoutRuby(example)).toBe("猫がいます。")
    expect(correctButton).toHaveFocus()
    expectBefore(prompt!, example!)
    expectBefore(example!, meaning)
    expectBefore(meaning, image)
    expectBefore(image, correctButton)
  })

  it("keeps the grammar question, then the English meaning and images, then controls", () => {
    const { container } = renderRevealedReview(
      grammarItem("grammar_oral_meaning"),
    )

    const prompts = container.querySelectorAll(".prompt-main")
    const correctButton = screen.getByRole("button", { name: /^correct$/i })
    const meaning = screen.getByText("I searched in the dictionary")
    const image = screen.getByTestId("card-image")

    expect(prompts).toHaveLength(1)
    expect(correctButton).toHaveFocus()
    expectBefore(prompts[0]!, meaning)
    expectBefore(meaning, image)
    expectBefore(image, correctButton)
  })

  it("has no way back to the question for an oral mode by default", () => {
    renderRevealedReview(vocabItem("vocab_oral_en"))

    expect(
      screen.queryByRole("button", { name: "Undo answer" }),
    ).not.toBeInTheDocument()
  })

  it("shows a way back to the question for an oral mode when flip-back is requested", () => {
    render(
      <ReviewSessionAnswerPanel
        item={vocabItem("vocab_oral_en")}
        typed=""
        expected=""
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
        showFlipBack
      />,
    )

    expect(
      screen.getByRole("button", { name: "Undo answer" }),
    ).toBeInTheDocument()
  })
})

function renderAnswerPanel(typed: string) {
  return render(
    <ReviewSessionAnswerPanel
      item={vocabWordItem}
      typed={typed}
      expected="猫"
      pendingIncorrectDelay={false}
      onJudge={vi.fn()}
      onUndoAnswer={vi.fn()}
    />,
  )
}

describe("ReviewSessionAnswerPanel", () => {
  it("shows only the furigana card answer after a correct Japanese word entry", () => {
    const { container } = renderAnswerPanel("猫")

    expect(screen.queryByText("Your answer")).toBeNull()
    // The correct answer carries its reading as furigana.
    expect(container.querySelector("ruby")?.textContent).toBe("猫ねこ")
  })

  it("keeps the comparison visible after an incorrect Japanese word entry", () => {
    const { container } = renderAnswerPanel("犬")

    expect(
      screen.getByRole("group", { name: /answer comparison/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Correct answer")).toBeInTheDocument()
    expect(screen.getByText("Your answer")).toBeInTheDocument()
    // The correct answer still shows its furigana reading on hover.
    expect(container.querySelector("rt")?.textContent).toBe("ねこ")
  })

  it("shows a concatenated fallback reading for a phrase word with no whole-word reading field", () => {
    const item: DueItem = {
      card: {
        id: "card-phrase",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "結論に至る",
          readingParts: { 結論: "けつろん", 至る: "いたる" },
          definitionsEn: ["to reach a conclusion"],
          images: [],
          exampleSentences: [],
        },
      },
      modeId: "vocab_type_word_from_clue",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionAnswerPanel
        item={item}
        typed="結論に至る"
        expected="結論に至る"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    expect(container.querySelector("rt")?.textContent).toBe("けつろんにいたる")
  })
})

function twoGapItem(): DueItem {
  return {
    card: {
      id: "card-3",
      deckId: "deck-1",
      kind: "grammar",
      updatedAt: 0,
      content: {
        sentenceWithGap: "___を___",
        gapMarker: "___",
        construction: "流し, 呼ぶ",
        translationEn: "Call a carriage",
        readings: {},
        images: [],
      },
    },
    modeId: "grammar_type_construction",
    due: 0,
    isLeech: false,
  }
}

describe("ReviewSessionAnswerPanel — grammar reading quiz", () => {
  function readingItem(): DueItem {
    return {
      card: {
        id: "card-4",
        deckId: "deck-1",
        kind: "grammar",
        updatedAt: 0,
        content: {
          sentenceWithGap: "彼は___と思った",
          gapMarker: "___",
          construction: "結論に至る",
          translationEn: "he came to a conclusion",
          constructionReadingParts: { 結論: "けつろん", 至る: "いたる" },
          readings: {},
          images: [],
        },
      },
      modeId: "grammar_type_reading",
      due: 0,
      isLeech: false,
    }
  }

  it("shows only the correct answer for a matching per-segment reading", async () => {
    render(
      <ReviewSessionAnswerPanel
        item={readingItem()}
        typed="けつろん, いたる"
        expected="けつろん, いたる"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    expect(screen.getByText("Correct answer")).toBeInTheDocument()
    expect(screen.queryByText("Your answer")).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^correct$/i })).toHaveFocus()
    })
  })

  it("focuses Incorrect for a merged answer missing the segment separator", async () => {
    render(
      <ReviewSessionAnswerPanel
        item={readingItem()}
        typed="けつろんいたる"
        expected="けつろん, いたる"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^incorrect$/i })).toHaveFocus()
    })
  })
})

describe("ReviewSessionAnswerPanel — multi-gap focus bias", () => {
  it("focuses Incorrect for a merged wrong answer, not Correct via punctuation-stripping", async () => {
    render(
      <ReviewSessionAnswerPanel
        item={twoGapItem()}
        typed="流し呼ぶ"
        expected="流し, 呼ぶ"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^incorrect$/i })).toHaveFocus()
    })
  })

  it("still focuses Correct for a genuinely matching two-gap answer", async () => {
    render(
      <ReviewSessionAnswerPanel
        item={twoGapItem()}
        typed="流し, 呼ぶ"
        expected="流し, 呼ぶ"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^correct$/i })).toHaveFocus()
    })
  })

  it("still applies punctuation-fuzzy focus for a single-gap construction whose answer text itself contains a 、", async () => {
    // The construction is a single gap-filler that happens to contain a
    // Japanese comma as ordinary sentence punctuation, not a multi-gap
    // separator — countGaps is 1, so this must not be treated as multi-part.
    const item: DueItem = {
      card: {
        id: "card-5",
        deckId: "deck-1",
        kind: "grammar",
        updatedAt: 0,
        content: {
          sentenceWithGap: "彼は___と言った",
          gapMarker: "___",
          construction: "はい、そうです",
          translationEn: "he said, yes that's right",
          readings: {},
          images: [],
        },
      },
      modeId: "grammar_type_construction",
      due: 0,
      isLeech: false,
    }

    render(
      <ReviewSessionAnswerPanel
        item={item}
        typed="はいそうです"
        expected="はい、そうです"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^correct$/i })).toHaveFocus()
    })
  })
})

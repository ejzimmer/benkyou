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

const readingItem: DueItem = {
  card: {
    id: "card-1",
    deckId: "deck-1",
    kind: "vocabulary",
    updatedAt: 0,
    content: {
      wordJa: "猫",
      reading: "ねこ",
      definitionsEn: ["cat"],
      images: [],
      exampleSentences: [],
      synonymsJa: [],
    },
  },
  modeId: "vocab_type_reading",
  due: 0,
}

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
      name: "Hiragana answer",
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
      name: /hiragana answer comparison/i,
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
        synonymsJa: [],
      },
    },
    modeId,
    due: 0,
  }
}

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
        synonymsJa: [],
      },
    },
    modeId,
    due: 0,
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
        synonymWarn={false}
        onTypedSubmit={vi.fn()}
        revealed
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

function expectBefore(first: Element, second: Element) {
  expect(
    Boolean(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  ).toBe(true)
}

describe("ReviewSessionAnswerPanel", () => {
  it("puts oral vocabulary controls before the English meaning and images", () => {
    const { container } = renderRevealedReview(vocabItem("vocab_oral_en"))

    const prompt = container.querySelector(".prompt-main")
    const example = screen.getByText("猫がいます。")
    const correctButton = screen.getByRole("button", { name: /^correct$/i })
    const meaning = screen.getByText("cat")
    const image = screen.getByTestId("card-image")

    expect(prompt).not.toBeNull()
    expect(correctButton).toHaveFocus()
    expectBefore(prompt!, example)
    expectBefore(example, correctButton)
    expectBefore(correctButton, meaning)
    expectBefore(meaning, image)
  })

  it("uses the existing grammar prompt before controls and English meaning", () => {
    const { container } = renderRevealedReview(
      grammarItem("grammar_oral_meaning"),
    )

    const prompts = container.querySelectorAll(".prompt-main")
    const correctButton = screen.getByRole("button", { name: /^correct$/i })
    const meaning = screen.getByText("I searched in the dictionary")
    const image = screen.getByTestId("card-image")

    expect(prompts).toHaveLength(1)
    expect(correctButton).toHaveFocus()
    expectBefore(prompts[0]!, correctButton)
    expectBefore(correctButton, meaning)
    expectBefore(meaning, image)
  })
})

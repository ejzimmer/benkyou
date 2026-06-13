import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DueItem } from "../../services/review"
import { ReviewSessionAnswerPanel } from "./ReviewSessionAnswerPanel"

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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^correct$/i })).toHaveFocus()
    })
  })

  it("labels and aligns a wrong hiragana answer, then focuses Incorrect", async () => {
    render(
      <ReviewSessionAnswerPanel
        item={readingItem}
        typed="ぬこ"
        expected="ねこ"
        pendingIncorrectDelay={false}
        onJudge={vi.fn()}
        onUndoAnswer={vi.fn()}
      />,
    )

    const comparison = screen.getByRole("group", {
      name: /hiragana answer comparison/i,
    })
    const correctLabel = within(comparison).getByText("Correct answer")
    const correctValue = within(comparison).getByText("ねこ")
    const typedLabel = within(comparison).getByText("Your answer")
    const typedValue = within(comparison).getByText("ぬこ")

    expect(comparison.textContent).toMatch(
      /Correct answer\s*ねこ\s*Your answer\s*ぬこ/,
    )
    expect(correctLabel.compareDocumentPosition(correctValue)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(typedLabel.compareDocumentPosition(typedValue)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(correctValue).toHaveClass("reading-answer-value")
    expect(typedValue).toHaveClass("reading-answer-value")

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^incorrect$/i })).toHaveFocus()
    })
  })
})

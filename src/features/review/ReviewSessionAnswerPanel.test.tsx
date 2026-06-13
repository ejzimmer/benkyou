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
    expect(answer.querySelector(".reading-answer-diff-cell")).not.toBeInTheDocument()

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
    expect(typedLine.querySelectorAll(".reading-answer-diff-cell")[2]).toHaveClass(
      "reading-answer-diff-gap",
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^incorrect$/i })).toHaveFocus()
    })
  })
})

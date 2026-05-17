import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReviewSessionPromptBody } from "./ReviewSessionPromptBody"
import type { DueItem } from "../../services/review"

const vocabItem: DueItem = {
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

describe("ReviewSessionPromptBody", () => {
  it("focuses the typing input when the prompt is shown", () => {
    render(
      <ReviewSessionPromptBody
        item={vocabItem}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        synonymWarn={false}
        onTypedSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("textbox")).toHaveFocus()
  })
})

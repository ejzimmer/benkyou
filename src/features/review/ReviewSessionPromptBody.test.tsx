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
  it("focuses the typing input on non-touch devices when the prompt is shown", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
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
    vi.unstubAllGlobals()
  })

  it("does not auto-focus the typing input on touch-primary devices", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches:
          query.includes("hover: none") && query.includes("pointer: coarse"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )

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

    expect(screen.getByRole("textbox")).not.toHaveFocus()
    vi.unstubAllGlobals()
  })
})

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

const grammarItem: DueItem = {
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
      images: [],
      synonymsJa: [],
    },
  },
  modeId: "grammar_type_construction",
  due: 0,
}

function stubTouchPrimaryDevice(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches:
        matches &&
        query.includes("hover: none") &&
        query.includes("pointer: coarse"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

describe("ReviewSessionPromptBody", () => {
  it("focuses the typing input on non-touch devices when the prompt is shown", () => {
    stubTouchPrimaryDevice(false)
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
    stubTouchPrimaryDevice(true)

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

  it("embeds grammar typing input where the gap marker appears", () => {
    stubTouchPrimaryDevice(false)

    render(
      <ReviewSessionPromptBody
        item={grammarItem}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        synonymWarn={false}
        onTypedSubmit={vi.fn()}
      />,
    )

    const input = screen.getByLabelText("Construction gap 1")
    const sentence = input.closest(".ruby-sentence")
    expect(sentence).not.toBeNull()

    const nodes = Array.from(sentence?.childNodes ?? [])
    const inputIndex = nodes.indexOf(input)
    expect(inputIndex).toBeGreaterThan(0)
    expect(nodes.slice(0, inputIndex).map((node) => node.textContent).join("")).toBe(
      "辞書",
    )
    expect(nodes.slice(inputIndex + 1).map((node) => node.textContent).join("")).toBe(
      "探しました",
    )
    expect(screen.getAllByRole("textbox")).toHaveLength(1)
    expect(input).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it("fills the gap with the highlighted construction for the oral-meaning prompt", () => {
    const item: DueItem = {
      card: {
        id: "card-3",
        deckId: "deck-1",
        kind: "grammar",
        updatedAt: 0,
        content: {
          sentenceWithGap: "りんご___、大きい",
          gapMarker: "___",
          construction: "より",
          translationEn: "bigger than an apple",
          readings: {},
          images: [],
          synonymsJa: [],
        },
      },
      modeId: "grammar_oral_meaning",
      due: 0,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        synonymWarn={false}
        onTypedSubmit={vi.fn()}
      />,
    )

    const sentence = container.querySelector(".ruby-sentence")
    expect(sentence?.textContent).toBe("りんごより、大きい")
    const fill = container.querySelector(".construction-fill")
    expect(fill?.textContent).toBe("より")
    // Oral mode shows the sentence, not a typing input.
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("does not auto-focus inline grammar input on touch-primary devices", () => {
    stubTouchPrimaryDevice(true)

    render(
      <ReviewSessionPromptBody
        item={grammarItem}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        synonymWarn={false}
        onTypedSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Construction gap 1")).not.toHaveFocus()
    vi.unstubAllGlobals()
  })
})

import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  ReviewSessionPromptBody,
  type ReviewSessionPromptBodyProps,
} from "./ReviewSessionPromptBody"
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
    },
  },
  modeId: "vocab_type_reading",
  due: 0,
  isLeech: false,
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
    },
  },
  modeId: "grammar_type_construction",
  due: 0,
  isLeech: false,
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

/** Renders both columns together, matching how ReviewSessionPage composes
 * them pre-reveal — needed for tests that assert on content split across
 * the clue (question) and the typing input (answer). */
function renderBothColumns(
  props: Omit<ReviewSessionPromptBodyProps, "column">,
) {
  return render(
    <>
      <ReviewSessionPromptBody {...props} column="question" />
      <ReviewSessionPromptBody {...props} column="answer" />
    </>,
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
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="answer"
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
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="answer"
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
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
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
        },
      },
      modeId: "grammar_oral_meaning",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const sentence = container.querySelector(".ruby-sentence")
    expect(sentence?.textContent).toBe("りんごより、大きい")
    const fill = container.querySelector(".construction-fill")
    expect(fill?.textContent).toBe("より")
    // Oral mode shows the sentence, not a typing input.
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("shows per-word furigana in vocab example sentences from the readings map", () => {
    const item: DueItem = {
      card: {
        id: "card-5",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          readings: { 大好き: "だいすき" },
          definitionsEn: ["cat"],
          images: [],
          exampleSentences: ["猫が大好きです。"],
        },
      },
      modeId: "vocab_oral_en",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const sentence = container.querySelector("p.muted .ruby-sentence")
    expect(sentence).not.toBeNull()
    const rubies = Array.from(sentence?.querySelectorAll("ruby") ?? [])
    expect(rubies.map((r) => r.firstChild?.textContent)).toEqual([
      "猫",
      "大好き",
    ])
    expect(rubies.map((r) => r.querySelector("rt")?.textContent)).toEqual([
      "ねこ",
      "だいすき",
    ])
  })

  it("does not leak the tested reading via example-sentence furigana before reveal", () => {
    const item: DueItem = {
      card: {
        id: "card-6",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          readings: { 大好き: "だいすき" },
          definitionsEn: ["cat"],
          images: [],
          exampleSentences: ["猫が大好きです。"],
        },
      },
      modeId: "vocab_type_reading",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const sentence = container.querySelector(".prompt-extras-content .ruby-sentence")
    expect(sentence).not.toBeNull()
    const rubies = Array.from(sentence?.querySelectorAll("ruby") ?? [])
    // The unrelated word's explicit reading still shows as a hint...
    expect(rubies.map((r) => r.firstChild?.textContent)).toEqual(["大好き"])
    // ...but the tested word itself is plain text, not furigana-annotated.
    expect(sentence?.textContent).toContain("猫")
    expect(
      Array.from(sentence?.querySelectorAll("rt") ?? []).map(
        (rt) => rt.textContent,
      ),
    ).not.toContain("ねこ")
  })

  it("toggles the meaning/examples/images disclosure open and closed on click", async () => {
    const user = userEvent.setup()
    const item: DueItem = {
      card: {
        id: "card-6b",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          definitionsEn: ["cat"],
          images: [],
          exampleSentences: [],
        },
      },
      modeId: "vocab_type_reading",
      due: 0,
      isLeech: false,
    }

    render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const toggle = screen.getByRole("button", {
      name: /show meaning, examples/i,
    })
    const content = document.getElementById(
      toggle.getAttribute("aria-controls") ?? "",
    )
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(content).toHaveAttribute("aria-hidden", "true")
    expect(toggle.querySelector(".prompt-extras-chevron")).not.toHaveClass(
      "is-open",
    )

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(content).toHaveAttribute("aria-hidden", "false")
    expect(toggle.querySelector(".prompt-extras-chevron")).toHaveClass(
      "is-open",
    )

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(content).toHaveAttribute("aria-hidden", "true")
  })

  it("shows per-segment furigana for a phrase word in the oral-meaning prompt", () => {
    const item: DueItem = {
      card: {
        id: "card-7",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "結論に至る",
          readings: { 結論: "けつろん", 至る: "いたる" },
          definitionsEn: ["to reach a conclusion"],
          images: [],
          exampleSentences: [],
        },
      },
      modeId: "vocab_oral_en",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const prompt = container.querySelector(".prompt-main")
    const rubies = Array.from(prompt?.querySelectorAll("ruby") ?? [])
    expect(rubies.map((r) => r.firstChild?.textContent)).toEqual([
      "結論",
      "至る",
    ])
    expect(rubies.map((r) => r.querySelector("rt")?.textContent)).toEqual([
      "けつろん",
      "いたる",
    ])
    expect(prompt?.textContent).toBe("結論けつろんに至るいたる")
  })

  it("asks for a phrase word's reading segment by segment, hiding both from example furigana", () => {
    const item: DueItem = {
      card: {
        id: "card-8",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "結論に至る",
          readingParts: { 結論: "けつろん", 至る: "いたる" },
          readings: { 結論: "けつろん", 至る: "いたる" },
          definitionsEn: ["to reach a conclusion"],
          images: [],
          exampleSentences: ["彼は結論に至るのが早い。"],
        },
      },
      modeId: "vocab_type_reading",
      due: 0,
      isLeech: false,
    }

    renderBothColumns({
      item,
      typed: "",
      onTypedChange: vi.fn(),
      readingWarn: false,
      kanjiWarn: false,
      onTypedSubmit: vi.fn(),
    })

    expect(screen.getByLabelText("Reading for 結論")).toBeInTheDocument()
    expect(screen.getByLabelText("Reading for 至る")).toBeInTheDocument()
    expect(screen.getAllByRole("textbox")).toHaveLength(2)

    const toggle = screen.getByRole("button", {
      name: /show meaning, examples/i,
    })
    const content = document.getElementById(
      toggle.getAttribute("aria-controls") ?? "",
    )
    expect(content?.querySelectorAll("ruby")).toHaveLength(0)
  })

  it("combines each phrase-word segment's answer into a single comma-separated typed value", async () => {
    const user = userEvent.setup()
    const item: DueItem = {
      card: {
        id: "card-9",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "結論に至る",
          readingParts: { 結論: "けつろん", 至る: "いたる" },
          definitionsEn: [],
          images: [],
          exampleSentences: [],
        },
      },
      modeId: "vocab_type_reading",
      due: 0,
      isLeech: false,
    }

    render(<StatefulPromptBody item={item} column="answer" />)

    await user.type(screen.getByLabelText("Reading for 結論"), "けつろん")
    await user.type(screen.getByLabelText("Reading for 至る"), "いたる")

    expect(
      screen.getByLabelText<HTMLInputElement>("Reading for 結論").value,
    ).toBe("けつろん")
    expect(
      screen.getByLabelText<HTMLInputElement>("Reading for 至る").value,
    ).toBe("いたる")
  })

  it("fills the grammar reading-quiz gap with plain kanji and asks per segment", () => {
    const item: DueItem = {
      card: {
        id: "card-10",
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

    const { container } = renderBothColumns({
      item,
      typed: "",
      onTypedChange: vi.fn(),
      readingWarn: false,
      kanjiWarn: false,
      onTypedSubmit: vi.fn(),
    })

    const fill = container.querySelector(".construction-fill")
    expect(fill?.textContent).toBe("結論に至る")
    expect(fill?.querySelector("ruby")).toBeNull()
    expect(screen.getByLabelText("Reading for 結論")).toBeInTheDocument()
    expect(screen.getByLabelText("Reading for 至る")).toBeInTheDocument()
    // The meaning sits behind the collapsed expander, not shown up front.
    const toggle = screen.getByRole("button", { name: /show meaning/i })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    const content = document.getElementById(
      toggle.getAttribute("aria-controls") ?? "",
    )
    expect(content).toHaveAttribute("aria-hidden", "true")
    expect(content).toHaveTextContent("he came to a conclusion")
  })

  it("fills each gap of a multi-gap grammar reading quiz with its own answer, not the whole construction", () => {
    const item: DueItem = {
      card: {
        id: "card-11",
        deckId: "deck-1",
        kind: "grammar",
        updatedAt: 0,
        content: {
          sentenceWithGap: "___を___",
          gapMarker: "___",
          construction: "流し, 呼ぶ",
          translationEn: "call a carriage",
          constructionReadingParts: { 流し: "ながし", 呼ぶ: "よぶ" },
          readings: {},
          images: [],
        },
      },
      modeId: "grammar_type_reading",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const fills = Array.from(container.querySelectorAll(".construction-fill"))
    expect(fills.map((f) => f.textContent)).toEqual(["流し", "呼ぶ"])
    expect(container.querySelector(".ruby-sentence")?.textContent).toBe(
      "流しを呼ぶ",
    )
  })

  it("honors a furigana map entry that fully covers the headline word's kanji, over the tested reading", () => {
    const item: DueItem = {
      card: {
        id: "card-12",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          readings: { 猫: "ネコ" },
          definitionsEn: ["cat"],
          images: [],
          exampleSentences: [],
        },
      },
      modeId: "vocab_oral_en",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const rt = container.querySelector(".prompt-main rt")
    expect(rt?.textContent).toBe("ネコ")
  })

  it("falls back to the tested reading when the furigana map doesn't cover the word's kanji", () => {
    const item: DueItem = {
      card: {
        id: "card-13",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "猫",
          reading: "ねこ",
          readings: {},
          definitionsEn: ["cat"],
          images: [],
          exampleSentences: [],
        },
      },
      modeId: "vocab_oral_en",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const rt = container.querySelector(".prompt-main rt")
    expect(rt?.textContent).toBe("ねこ")
  })

  it("shows a per-kanji furigana split for a phrase word tested as one whole reading", () => {
    const item: DueItem = {
      card: {
        id: "card-14",
        deckId: "deck-1",
        kind: "vocabulary",
        updatedAt: 0,
        content: {
          wordJa: "結論に至る",
          reading: "けつろんにいたる",
          readings: { 結論: "けつろん", 至: "いた" },
          definitionsEn: ["reach a conclusion"],
          images: [],
          exampleSentences: [],
        },
      },
      modeId: "vocab_oral_en",
      due: 0,
      isLeech: false,
    }

    const { container } = render(
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    const rubies = Array.from(container.querySelectorAll(".prompt-main ruby"))
    expect(rubies.map((r) => r.textContent)).toEqual(["結論けつろん", "至いた"])
  })

  it("does not auto-focus inline grammar input on touch-primary devices", () => {
    stubTouchPrimaryDevice(true)

    render(
      <ReviewSessionPromptBody
        item={grammarItem}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    expect(screen.getByLabelText("Construction gap 1")).not.toHaveFocus()
    vi.unstubAllGlobals()
  })

  it("shows the kanji validation error for a type-the-word answer missing kanji", () => {
    render(
      <ReviewSessionPromptBody
        item={{ ...vocabItem, modeId: "vocab_type_word_from_clue" }}
        typed="ねこ"
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn
        onTypedSubmit={vi.fn()}
        column="answer"
      />,
    )

    expect(screen.getByText(/answer uses kanji/i)).toBeInTheDocument()
  })

  it("shows the missed-doubled-n validation error for a reading answer", () => {
    render(
      <ReviewSessionPromptBody
        item={vocabItem}
        typed="うねいしゃ"
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        nWarn
        onTypedSubmit={vi.fn()}
        column="answer"
      />,
    )

    expect(screen.getByText(/missed ん/i)).toBeInTheDocument()
  })
})

const twoGapItem: DueItem = {
  card: {
    id: "card-4",
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

function StatefulPromptBody({
  item,
  column,
}: {
  item: DueItem
  column: ReviewSessionPromptBodyProps["column"]
}) {
  const [typed, setTyped] = useState("")
  return (
    <ReviewSessionPromptBody
      item={item}
      typed={typed}
      onTypedChange={setTyped}
      readingWarn={false}
      kanjiWarn={false}
      onTypedSubmit={vi.fn()}
      column={column}
    />
  )
}

describe("ReviewSessionPromptBody — multiple gaps", () => {
  it("renders one input per gap when answer parts match gap count", () => {
    stubTouchPrimaryDevice(false)

    render(
      <ReviewSessionPromptBody
        item={twoGapItem}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        column="question"
      />,
    )

    expect(screen.getByLabelText("Construction gap 1")).toBeInTheDocument()
    expect(screen.getByLabelText("Construction gap 2")).toBeInTheDocument()
    expect(screen.getAllByRole("textbox")).toHaveLength(2)
    vi.unstubAllGlobals()
  })

  it("combines each gap's answer into a single comma-separated typed value", async () => {
    const user = userEvent.setup()
    render(<StatefulPromptBody item={twoGapItem} column="question" />)

    await user.type(screen.getByLabelText("Construction gap 1"), "流し")
    await user.type(screen.getByLabelText("Construction gap 2"), "呼ぶ")

    expect(
      screen.getByLabelText<HTMLInputElement>("Construction gap 1").value,
    ).toBe("流し")
    expect(
      screen.getByLabelText<HTMLInputElement>("Construction gap 2").value,
    ).toBe("呼ぶ")
  })

  it("shows each gap's own answer once revealed", () => {
    render(
      <ReviewSessionPromptBody
        item={twoGapItem}
        typed="流し, 呼ぶ"
        onTypedChange={vi.fn()}
        readingWarn={false}
        kanjiWarn={false}
        onTypedSubmit={vi.fn()}
        revealed
        column="question"
      />,
    )

    const fills = screen
      .getAllByText((_, el) => el?.className === "gap-filled")
      .map((el) => el.textContent)
    expect(fills).toEqual(["流し", "呼ぶ"])
  })
})

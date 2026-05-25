/**
 * @vitest-environment jsdom
 *
 * Reported bug: on `vocab_oral_en` and `vocab_type_reading` cards the image
 * appears twice as soon as the user hits "Show answer" — because the image
 * is rendered in both `ReviewSessionPromptBody` AND `ReviewSessionAnswerPanel`
 * for those two modes.
 *
 * The image belongs with the meaning side. For these two modes the meaning
 * sits in the answer panel (English defs / reading), so the prompt body
 * should not render images.
 *
 * This file pins that: when both panels are mounted for the same item, each
 * media id appears exactly once on the page.
 */

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReviewSessionAnswerPanel } from "./ReviewSessionAnswerPanel"
import { ReviewSessionPromptBody } from "./ReviewSessionPromptBody"
import type { DueItem } from "../../services/review"
import type { ReviewModeId } from "../../domain/types"

vi.mock("../../ui/CardImage", () => ({
  CardImage: ({ mediaId }: { mediaId: string }) => (
    <div data-testid="card-image" data-mediaid={mediaId}>
      {mediaId}
    </div>
  ),
}))

function vocabItem(modeId: ReviewModeId, images: string[]): DueItem {
  return {
    card: {
      id: "card-1",
      deckId: "deck-1",
      kind: "vocabulary",
      updatedAt: 0,
      content: {
        wordJa: "鳥",
        reading: "とり",
        definitionsEn: ["bird"],
        images,
        exampleSentences: [],
        synonymsJa: [],
      },
    },
    modeId,
    due: 0,
  }
}

function grammarItem(modeId: ReviewModeId, images: string[]): DueItem {
  return {
    card: {
      id: "card-2",
      deckId: "deck-1",
      kind: "grammar",
      updatedAt: 0,
      content: {
        sentenceWithGap: "私は___です",
        gapMarker: "___",
        construction: "学生",
        translationEn: "I am a student",
        readings: {},
        images,
        synonymsJa: [],
      },
    },
    modeId,
    due: 0,
  }
}

function renderBoth(item: DueItem) {
  return render(
    <>
      <ReviewSessionPromptBody
        item={item}
        typed=""
        onTypedChange={vi.fn()}
        readingWarn={false}
        synonymWarn={false}
        onTypedSubmit={vi.fn()}
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

describe("review screen image rendering — no duplicate <CardImage>", () => {
  for (const modeId of [
    "vocab_oral_en",
    "vocab_type_reading",
    "vocab_type_word_from_clue",
  ] as ReviewModeId[]) {
    it(`renders each image id once for vocab mode ${modeId}`, () => {
      renderBoth(vocabItem(modeId, ["img-a", "img-b"]))
      const allImages = screen.queryAllByTestId("card-image")
      const ids = allImages.map((el) => el.getAttribute("data-mediaid"))
      expect(ids.sort()).toEqual(["img-a", "img-b"])
    })
  }

  for (const modeId of [
    "grammar_type_construction",
    "grammar_oral_meaning",
  ] as ReviewModeId[]) {
    it(`renders each image id once for grammar mode ${modeId}`, () => {
      renderBoth(grammarItem(modeId, ["img-x"]))
      const allImages = screen.queryAllByTestId("card-image")
      const ids = allImages.map((el) => el.getAttribute("data-mediaid"))
      expect(ids).toEqual(["img-x"])
    })
  }
})

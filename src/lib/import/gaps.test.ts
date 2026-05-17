import { describe, expect, it } from "vitest"
import {
  applyImportDrafts,
  collectImportGaps,
  isImportGapDraftSatisfied,
  isImportGapResolved,
} from "./gaps"
import type { BulkImportPayload } from "./types"
import type { Card, VocabularyCardContent } from "../../domain/types"
import { serializeFsrs, emptyFsrs } from "../srs/schedule"

function vocabCard(
  id: string,
  patch: Partial<VocabularyCardContent> = {},
): Card {
  return {
    id,
    deckId: "d",
    kind: "vocabulary",
    updatedAt: 1,
    content: {
      wordJa: "猫",
      definitionsEn: [],
      images: [],
      exampleSentences: [],
      synonymsJa: [],
      ...patch,
    },
  }
}

describe("import gaps", () => {
  it("detects incomplete vocabulary card", () => {
    const payload: BulkImportPayload = {
      deck: { id: "d", name: "Test", updatedAt: 1 },
      cards: [vocabCard("c1", { wordJa: "猫" })],
      scheduling: [],
      media: [],
    }
    expect(collectImportGaps(payload)).toHaveLength(1)
  })

  it("accepts draft with english", () => {
    const card = vocabCard("c1", { wordJa: "猫" })
    const draft = {
      kind: "vocabulary" as const,
      englishLines: "cat",
    }
    expect(isImportGapDraftSatisfied(card, draft)).toBe(true)
  })

  it("discarded draft counts as resolved", () => {
    const card = vocabCard("c1", { wordJa: "猫" })
    expect(
      isImportGapResolved(card, { kind: "vocabulary", discarded: true }),
    ).toBe(true)
  })

  it("applyImportDrafts completes payload", async () => {
    const payload: BulkImportPayload = {
      deck: { id: "d", name: "Test", updatedAt: 1 },
      cards: [vocabCard("c1", { wordJa: "猫" })],
      scheduling: [],
      media: [],
    }
    const completed = await applyImportDrafts(payload, {
      c1: { kind: "vocabulary", englishLines: "cat" },
    })
    expect(collectImportGaps(completed)).toHaveLength(0)
    expect(completed.cards[0]?.kind === "vocabulary" && completed.cards[0].content.definitionsEn).toEqual([
      "cat",
    ])
  })

  it("omits discarded gap cards and scheduling", async () => {
    const payload: BulkImportPayload = {
      deck: { id: "d", name: "Test", updatedAt: 1 },
      cards: [
        vocabCard("c1", { wordJa: "猫" }),
        vocabCard("c2", { wordJa: "犬", definitionsEn: ["dog"] }),
      ],
      scheduling: [
        {
          id: "c1:m",
          cardId: "c1",
          modeId: "vocab_oral_en",
          fsrs: serializeFsrs(emptyFsrs()),
          due: 0,
          updatedAt: 1,
        },
        {
          id: "c2:m",
          cardId: "c2",
          modeId: "vocab_oral_en",
          fsrs: serializeFsrs(emptyFsrs()),
          due: 0,
          updatedAt: 1,
        },
      ],
      media: [],
    }
    const completed = await applyImportDrafts(payload, {
      c1: { kind: "vocabulary", discarded: true },
    })
    expect(completed.cards).toHaveLength(1)
    expect(completed.cards[0]?.id).toBe("c2")
    expect(completed.scheduling).toHaveLength(1)
    expect(completed.scheduling[0]?.cardId).toBe("c2")
  })
})

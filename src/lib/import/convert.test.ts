import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { reviewModesForCard } from "../../domain/types"
import { convertExtractedPackage } from "./convert"
import type { ExtractedAnkiNote, ExtractedPackage } from "./types"

describe("convertExtractedPackage", () => {
  it("converts a small extracted fixture", () => {
    const fixturePath = resolve(
      __dirname,
      "../../test/fixtures/anki-tonagari-mini.json",
    )
    const pkg = JSON.parse(
      readFileSync(fixturePath, "utf8"),
    ) as ExtractedPackage
    const payload = convertExtractedPackage(pkg, (relativePath) => {
      const abs = resolve(__dirname, "../../test/fixtures", relativePath)
      return new Uint8Array(readFileSync(abs))
    })
    expect(
      payload.cards.some(
        (card) => card.kind === "vocabulary" && card.content.wordJa === "陣",
      ),
    ).toBe(true)
    expect(payload.cards.some((card) => card.kind === "grammar")).toBe(true)
    expect(payload.media.length).toBeGreaterThan(0)

    const grammarCard = payload.cards.find((c) => c.kind === "grammar")
    expect(grammarCard?.kind).toBe("grammar")
    if (grammarCard?.kind !== "grammar") return
    const grammarScheduling = payload.scheduling.filter(
      (r) => r.cardId === grammarCard.id,
    )
    expect(grammarScheduling).toHaveLength(2)
    const [a, b] = grammarScheduling
    expect(a.due).toBe(b.due)
    expect(grammarCard.content.translationEn).not.toBe("流し、呼ぶ")
  })

  it("attaches a percent-encoded image ref to a kana-only reversed card", () => {
    // ぐうたら (kana) on the front, an image on the back, in a
    // "Basic (and reversed card)" note. The field's <img src> is percent-encoded
    // (Anki does this for spaces / non-ASCII filenames) while the media index is
    // keyed by the decoded name. Without normalizing the ref the image is dropped
    // and the kana card collapses to zero reviewable content.
    const note: ExtractedAnkiNote = {
      id: 1,
      noteType: "Basic (and reversed card)",
      fields: ["ぐうたら", '<img src="lazy%20cat.jpg">'],
      tags: "",
      cards: [
        { id: 1, ord: 0, type: 0, queue: 0, due: 0, ivl: 0, factor: 2500, reps: 0, lapses: 0 },
        { id: 2, ord: 1, type: 0, queue: 0, due: 0, ivl: 0, factor: 2500, reps: 0, lapses: 0 },
      ],
    }
    const pkg: ExtractedPackage = {
      deckId: 1,
      deckName: "T",
      collectionCrt: 0,
      notes: [note],
      mediaPaths: { "lazy cat.jpg": "media/lazy cat.jpg" },
    }
    const payload = convertExtractedPackage(pkg, () => new Uint8Array([1, 2, 3]))

    expect(payload.cards).toHaveLength(1)
    const card = payload.cards[0]
    expect(card.kind).toBe("vocabulary")
    if (card.kind !== "vocabulary") return
    expect(card.content.wordJa).toBe("ぐうたら")
    expect(card.content.images).toHaveLength(1)
    // The image clue keeps the card reviewable.
    expect(reviewModesForCard(card)).toContain("vocab_type_word_from_clue")
  })
})

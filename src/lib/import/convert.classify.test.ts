import { describe, expect, it } from "vitest"
import { collectGrammarCandidates, convertExtractedPackage } from "./convert"
import type { ExtractedAnkiNote, ExtractedPackage } from "./types"

function note(
  id: number,
  noteType: string,
  fields: string[],
): ExtractedAnkiNote {
  return {
    id,
    noteType,
    fields,
    tags: "",
    cards: [
      { id, ord: 0, type: 0, queue: 0, due: 0, ivl: 0, factor: 2500, reps: 0, lapses: 0 },
    ],
  }
}

function pkg(notes: ExtractedAnkiNote[]): ExtractedPackage {
  return {
    deckId: 1,
    deckName: "Test",
    collectionCrt: 0,
    notes,
    mediaPaths: {},
  }
}

const noMedia = () => new Uint8Array()

describe("convert: broadened reading detection", () => {
  it("attaches a reading written as «kana»の読み to the word card", () => {
    const payload = convertExtractedPackage(
      pkg([
        note(1, "Basic", ["陣", "formation"]),
        note(2, "Basic", ["«陣»", "«じん»の読み"]),
      ]),
      noMedia,
    )
    const card = payload.cards.find(
      (c) => c.kind === "vocabulary" && c.content.wordJa === "陣",
    )
    expect(card?.kind).toBe("vocabulary")
    if (card?.kind !== "vocabulary") return
    expect(card.content.reading).toBe("じん")
  })
})

describe("convert: [kanji]の読み reading cards", () => {
  it("merges a の読み reading card with its meaning card instead of flagging it", () => {
    const payload = convertExtractedPackage(
      pkg([
        note(1, "Basic", ["陣", "formation"]), // meaning
        note(2, "Basic", ["陣の読み", "じん"]), // reading, の読み on the kanji side
      ]),
      noMedia,
    )
    const vocab = payload.cards.filter((c) => c.kind === "vocabulary")
    // The reading card must merge into the one word card, not become a second,
    // matchless card asking for a reading/meaning.
    expect(vocab).toHaveLength(1)
    const card = vocab[0]
    if (card.kind !== "vocabulary") return
    expect(card.content.wordJa).toBe("陣")
    expect(card.content.reading).toBe("じん")
    expect(card.content.definitionsEn).toContain("formation")
  })
})

describe("convert: grammar/vocab confirmation", () => {
  const grammarPkg = pkg([
    note(10, "Basic (type in the answer)", ["私は学生___", "です"]),
  ])

  it("surfaces a gap-marked note as a grammar candidate", () => {
    const candidates = collectGrammarCandidates(grammarPkg)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].sentence).toContain("学生")
    expect(candidates[0].construction).toBe("です")
  })

  it("builds a grammar card by default", () => {
    const payload = convertExtractedPackage(grammarPkg, noMedia)
    expect(payload.cards.some((c) => c.kind === "grammar")).toBe(true)
  })

  it("builds a vocab card with the sentence as an example when marked vocab", () => {
    const key = collectGrammarCandidates(grammarPkg)[0].key
    const payload = convertExtractedPackage(grammarPkg, noMedia, {
      [key]: "vocab",
    })
    expect(payload.cards.some((c) => c.kind === "grammar")).toBe(false)
    const card = payload.cards.find((c) => c.kind === "vocabulary")
    expect(card?.kind).toBe("vocabulary")
    if (card?.kind !== "vocabulary") return
    expect(card.content.wordJa).toBe("です")
    expect(card.content.exampleSentences).toContain("私は学生___")
  })
})

describe("convert: general leftover fallback", () => {
  it("imports an otherwise-unhandled kana note as vocabulary (no throw)", () => {
    const payload = convertExtractedPackage(
      pkg([note(20, "Basic", ["ねこ", "cat"])]),
      noMedia,
    )
    const card = payload.cards.find(
      (c) => c.kind === "vocabulary" && c.content.wordJa === "ねこ",
    )
    expect(card?.kind).toBe("vocabulary")
    if (card?.kind !== "vocabulary") return
    expect(card.content.definitionsEn).toContain("cat")
  })
})

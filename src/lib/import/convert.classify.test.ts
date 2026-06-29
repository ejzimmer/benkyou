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

describe("convert: Basic (and reversed card) notes", () => {
  function reversedNote(
    id: number,
    fields: [string, string],
  ): ExtractedAnkiNote {
    const n = note(id, "Basic (and reversed card)", fields)
    // Anki generates two sibling cards (forward + reverse).
    n.cards = [
      { id, ord: 0, type: 0, queue: 0, due: 0, ivl: 0, factor: 2500, reps: 0, lapses: 0 },
      { id: id + 1000, ord: 1, type: 0, queue: 0, due: 0, ivl: 0, factor: 2500, reps: 0, lapses: 0 },
    ]
    return n
  }

  function pkgWithMedia(
    notes: ExtractedAnkiNote[],
    mediaPaths: Record<string, string>,
  ): ExtractedPackage {
    return { deckId: 1, deckName: "Test", collectionCrt: 0, notes, mediaPaths }
  }

  it("merges a word-front/image-back reversed card with its reading card", () => {
    const payload = convertExtractedPackage(
      pkgWithMedia(
        [
          reversedNote(1, ["痛み", '<img src="pain.jpg">']),
          note(3, "Basic", ["「痛み」", "いたみ"]), // pronunciation card
        ],
        { "pain.jpg": "media/pain.jpg" },
      ),
      () => new Uint8Array([1, 2, 3]),
    )
    const vocab = payload.cards.filter((c) => c.kind === "vocabulary")
    expect(vocab).toHaveLength(1)
    const card = vocab[0]
    if (card.kind !== "vocabulary") return
    expect(card.content.wordJa).toBe("痛み") // not the empty image side
    expect(card.content.reading).toBe("いたみ") // pulled from the reading card
    expect(card.content.images.length).toBeGreaterThan(0)
  })

  it.each(["「痛み」", "痛みの読み", "「痛み」の読み", "「痛みの読み」"])(
    "matches the pronunciation card and cleans the word for front=%s",
    (readingFront) => {
      const payload = convertExtractedPackage(
        pkgWithMedia(
          [
            reversedNote(1, ["痛み", "(no image)"]),
            note(3, "Basic", [readingFront, "いたみ"]),
          ],
          {},
        ),
        () => new Uint8Array(),
      )
      const vocab = payload.cards.filter((c) => c.kind === "vocabulary")
      expect(vocab).toHaveLength(1)
      const card = vocab[0]
      if (card.kind !== "vocabulary") return
      expect(card.content.wordJa).toBe("痛み") // no brackets / の読み in the word
      expect(card.content.reading).toBe("いたみ")
    },
  )

  it("merges an image+English-front/word-back reversed card with its reading card", () => {
    const payload = convertExtractedPackage(
      pkgWithMedia(
        [
          reversedNote(10, ['<img src="fame.jpg">famous', "有名"]),
          note(12, "Basic", ["「有名」", "ゆうめい"]),
        ],
        { "fame.jpg": "media/fame.jpg" },
      ),
      () => new Uint8Array([4, 5, 6]),
    )
    const vocab = payload.cards.filter((c) => c.kind === "vocabulary")
    expect(vocab).toHaveLength(1)
    const card = vocab[0]
    if (card.kind !== "vocabulary") return
    expect(card.content.wordJa).toBe("有名")
    expect(card.content.reading).toBe("ゆうめい")
    expect(card.content.definitionsEn).toContain("famous")
    expect(card.content.images.length).toBeGreaterThan(0)
  })
})

describe("convert: Basic clue→word card (Japanese on the back)", () => {
  // Distinct bytes per file so the media dedup keeps them separate.
  const distinctBytes = (rel: string) =>
    new Uint8Array(Array.from(rel, (ch) => ch.charCodeAt(0)))

  it("uses the Japanese back as the word and keeps the front's English + images", () => {
    const payload = convertExtractedPackage(
      {
        deckId: 1,
        deckName: "T",
        collectionCrt: 0,
        notes: [
          note(1, "Basic", [
            '<img src="a.jpg"><img src="b.jpg"><img src="c.jpg">Famous',
            "有名",
          ]),
        ],
        mediaPaths: {
          "a.jpg": "media/a.jpg",
          "b.jpg": "media/b.jpg",
          "c.jpg": "media/c.jpg",
        },
      },
      distinctBytes,
    )
    const card = payload.cards.find(
      (c) => c.kind === "vocabulary" && c.content.wordJa === "有名",
    )
    expect(card?.kind).toBe("vocabulary")
    if (card?.kind !== "vocabulary") return
    expect(card.content.wordJa).toBe("有名") // not "Famous"
    expect(card.content.definitionsEn).toContain("Famous")
    expect(card.content.images).toHaveLength(3)
  })

  it("merges with the matching pronunciation card", () => {
    const payload = convertExtractedPackage(
      pkg([
        note(1, "Basic", ["Famous", "有名"]),
        note(2, "Basic", ["「有名」", "ゆうめい"]),
      ]),
      noMedia,
    )
    const vocab = payload.cards.filter((c) => c.kind === "vocabulary")
    expect(vocab).toHaveLength(1)
    const card = vocab[0]
    if (card.kind !== "vocabulary") return
    expect(card.content.wordJa).toBe("有名")
    expect(card.content.reading).toBe("ゆうめい")
    expect(card.content.definitionsEn).toContain("Famous")
  })
})

describe("convert: kana word with an emoji meaning", () => {
  it("keeps the emoji as the meaning for a reversed kana card", () => {
    const reversed = note(1, "Basic (and reversed card)", ["ゆっくり", "🐌🐢"])
    reversed.cards = [
      { id: 1, ord: 0, type: 0, queue: 0, due: 0, ivl: 0, factor: 2500, reps: 0, lapses: 0 },
      { id: 2, ord: 1, type: 0, queue: 0, due: 0, ivl: 0, factor: 2500, reps: 0, lapses: 0 },
    ]
    const payload = convertExtractedPackage(pkg([reversed]), noMedia)
    const card = payload.cards.find(
      (c) => c.kind === "vocabulary" && c.content.wordJa === "ゆっくり",
    )
    expect(card?.kind).toBe("vocabulary")
    if (card?.kind !== "vocabulary") return
    expect(card.content.definitionsEn).toContain("🐌🐢")
  })

  it("keeps the emoji as the meaning for a plain Basic kana card", () => {
    const payload = convertExtractedPackage(
      pkg([note(5, "Basic", ["アヒル", "🦆"])]),
      noMedia,
    )
    const card = payload.cards.find(
      (c) => c.kind === "vocabulary" && c.content.wordJa === "アヒル",
    )
    expect(card?.kind).toBe("vocabulary")
    if (card?.kind !== "vocabulary") return
    expect(card.content.definitionsEn).toContain("🦆")
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

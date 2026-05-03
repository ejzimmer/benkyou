/** Deck groups cards with a display name. */
export type Deck = {
  id: string
  name: string
  updatedAt: number
}

/** Media blob stored locally (and synced via Storage later). */
export type MediaRef = {
  id: string
  mimeType: string
}

export type VocabularyCardContent = {
  wordJa: string
  /** Required when word contains kanji; hiragana/katakana reading */
  reading?: string
  definitionsEn: string[]
  images: string[]
  exampleSentences: string[]
  synonymsJa: string[]
}

export type GrammarCardContent = {
  /** Japanese sentence with a gap, e.g. "私は___です" */
  sentenceWithGap: string
  /** Marker substring that indicates the gap (default "___") */
  gapMarker: string
  construction: string
  translationEn: string
  /** Kanji phrases / segments → hiragana readings */
  readings: Record<string, string>
  images: string[]
  synonymsJa: string[]
}

export type Card =
  | {
      id: string
      deckId: string
      kind: "vocabulary"
      content: VocabularyCardContent
      updatedAt: number
      /** Reserved for future metadata (SRS summary, flags, etc.) */
      meta?: Record<string, unknown>
    }
  | {
      id: string
      deckId: string
      kind: "grammar"
      content: GrammarCardContent
      updatedAt: number
      meta?: Record<string, unknown>
    }

/** One FSRS schedule per card × review mode so intervals do not mix. */
export const REVIEW_MODES = [
  "vocab_oral_en",
  "vocab_type_reading",
  "vocab_type_word_from_clue",
  "grammar_type_construction",
  "grammar_oral_meaning",
] as const

export type ReviewModeId = (typeof REVIEW_MODES)[number]

export function reviewModesForCard(card: Card): ReviewModeId[] {
  if (card.kind === "vocabulary") {
    const hasKanji = containsKanji(card.content.wordJa)
    const base: ReviewModeId[] = [
      "vocab_oral_en",
      "vocab_type_word_from_clue",
    ]
    if (hasKanji) base.splice(1, 0, "vocab_type_reading")
    return base
  }
  return ["grammar_type_construction", "grammar_oral_meaning"]
}

export function containsKanji(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x4e00 && cp <= 0x9fff) return true
  }
  return false
}

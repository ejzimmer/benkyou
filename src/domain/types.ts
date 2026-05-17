/** Deck groups cards with a display name. */
export type Deck = {
  id: string
  name: string
  updatedAt: number
}

import {
  containsKanji,
  hasVocabularyEnglishDefinition,
  hasVocabularyImage,
  hasVocabularyPronunciation,
} from "./vocabularyContent"

export { containsKanji }

/** Media blob stored locally (and synced via Storage later). */
export type MediaRef = {
  id: string
  mimeType: string
}

export type VocabularyCardContent = {
  wordJa: string
  /** Hiragana reading — only for words with kanji (pronunciation study). */
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
    const c = card.content
    const modes: ReviewModeId[] = []
    if (hasVocabularyEnglishDefinition(c)) modes.push("vocab_oral_en")
    if (hasVocabularyPronunciation(c)) modes.push("vocab_type_reading")
    if (hasVocabularyEnglishDefinition(c) || hasVocabularyImage(c)) {
      modes.push("vocab_type_word_from_clue")
    }
    return modes
  }
  return ["grammar_type_construction", "grammar_oral_meaning"]
}


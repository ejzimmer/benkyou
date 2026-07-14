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
import { grammarPointFor, hasConstructionReading } from "./grammarContent"

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
  /**
   * Ordered word/cluster → reading pairs for a phrase word made of several
   * kanji clusters (e.g. 結論に至る = 結論/けつろん + 至る/いたる), each
   * tested separately. Used instead of `reading` when set with 2+ entries.
   */
  readingParts?: Record<string, string>
  /**
   * Kanji phrases → hiragana readings shown as furigana (the headline word
   * and example sentences). Independent of what's tested by `reading` /
   * `readingParts` — the card editor seeds it from them, but it can be
   * edited separately (e.g. narrowed to just the kanji, leaving okurigana
   * un-annotated: 至る/いたる seeds 至/いた).
   */
  readings?: Record<string, string>
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
  /**
   * Reading tested for the construction — independent of its literal text,
   * so a conjugated construction (e.g. 芳しく) can test its dictionary
   * form's reading (芳しい＝かんばしい) instead of the conjugated one.
   */
  constructionReading?: string
  /**
   * Ordered word/cluster → reading pairs when the construction is several
   * words/clusters tested separately (e.g. two gap-fillers, or a
   * multi-cluster phrase). Used instead of `constructionReading` when set
   * with 2+ entries.
   */
  constructionReadingParts?: Record<string, string>
  translationEn: string
  /** Kanji phrases → hiragana readings shown as furigana in the sentence. */
  readings: Record<string, string>
  images: string[]
  synonymsJa: string[]
  /**
   * What grammar point the gap tests, e.g. "conjugation" or "particle" —
   * set when the gap is really about correct grammatical form rather than
   * word choice (contrast 霧が消えた, where the interesting thing is that
   * Japanese uses "disappear" rather than "lift" for fog clearing). When
   * set, only the fill-in-the-gap mode is reviewed (no separate reading or
   * meaning drill — those aren't the point of a conjugation/particle card),
   * and the prompt asks "What's the correct {grammarPoint}?".
   */
  grammarPoint?: string
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
  "grammar_type_reading",
  "grammar_oral_meaning",
] as const

export type ReviewModeId = (typeof REVIEW_MODES)[number]

/** User-facing label for a card's kind — the internal "grammar" kind is shown as "Fill in the gap". */
export const CARD_KIND_LABELS: Record<Card["kind"], string> = {
  vocabulary: "Vocabulary",
  grammar: "Fill in the gap",
}

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
  const modes: ReviewModeId[] = ["grammar_type_construction"]
  if (grammarPointFor(card.content)) return modes
  if (hasConstructionReading(card.content)) {
    modes.push("grammar_type_reading")
  }
  if (card.content.translationEn.trim()) modes.push("grammar_oral_meaning")
  return modes
}


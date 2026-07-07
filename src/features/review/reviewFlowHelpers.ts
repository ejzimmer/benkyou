import type {
  Card,
  ReviewModeId,
  VocabularyCardContent,
} from "../../domain/types"
import { containsKanji } from "../../domain/types"
import { normalizeGapAnswers } from "../../domain/grammarGaps"
import { withWordReadingFallback } from "../../domain/readingsMap"

/** Marker used to blank out the target word in an example sentence. */
export const EXAMPLE_PLACEHOLDER = "___"

/**
 * Example sentences shown as clues when asking for the Japanese word: only
 * sentences that contain the blank placeholder, and never one that already
 * spells out the answer word.
 */
export function clueExampleSentences(content: VocabularyCardContent): string[] {
  const answer = content.wordJa.trim()
  return content.exampleSentences
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.includes(EXAMPLE_PLACEHOLDER) &&
        (!answer || !s.includes(answer)),
    )
}

/**
 * True when two answers are identical once whitespace and punctuation are
 * removed, but not byte-for-byte equal — e.g. a missing comma or full stop.
 */
export function differsOnlyByPunctuation(a: string, b: string): boolean {
  if (a === b) return false
  const strip = (s: string) =>
    s.normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "")
  const sa = strip(a)
  const sb = strip(b)
  return sa.length > 0 && sa === sb
}

/**
 * Phrase→reading map used to add furigana to a vocab card's example
 * sentences: the card's own per-phrase readings, plus its whole-word
 * reading so the word itself is annotated where it appears in a sentence
 * without needing a duplicate entry in the map.
 */
export function vocabExampleReadings(
  content: VocabularyCardContent,
): Record<string, string> {
  const readings = content.readings ?? {}
  if (!containsKanji(content.wordJa)) return { ...readings }
  return withWordReadingFallback(readings, content.wordJa, content.reading)
}

export const REVIEW_MODE_LABELS: Record<ReviewModeId, string> = {
  vocab_oral_en: "Say the meaning",
  vocab_type_reading: "Type the reading (hiragana)",
  vocab_type_word_from_clue: "Type the Japanese word",
  grammar_type_construction: "Type the construction",
  grammar_oral_meaning: "Say the meaning of the construction",
}

export function readingForConstruction(
  construction: string,
  readings: Record<string, string>,
): string | undefined {
  const keys = Object.keys(readings).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (construction.includes(k) && readings[k]?.trim()) return readings[k]
  }
  return undefined
}

export function requiresTyping(mode: ReviewModeId): boolean {
  return (
    mode === "vocab_type_reading" ||
    mode === "vocab_type_word_from_clue" ||
    mode === "grammar_type_construction"
  )
}

export function expectedAnswer(card: Card, mode: ReviewModeId): string {
  if (mode === "vocab_type_reading")
    return card.kind === "vocabulary" ? card.content.reading ?? "" : ""
  if (mode === "vocab_type_word_from_clue")
    return card.kind === "vocabulary" ? card.content.wordJa : ""
  if (mode === "grammar_type_construction")
    return card.kind === "grammar" ? card.content.construction : ""
  return ""
}

/**
 * Whether `typed` matches `expected` for grading purposes. Fill-in-the-gap
 * cards with multiple gaps compare each comma-separated answer positionally,
 * so "," vs "、" and incidental spacing around the separator don't cause a
 * correct answer to be treated as wrong.
 */
export function answersMatch(
  mode: ReviewModeId,
  typed: string,
  expected: string,
): boolean {
  if (mode === "grammar_type_construction") {
    return normalizeGapAnswers(typed) === normalizeGapAnswers(expected)
  }
  return typed === expected
}

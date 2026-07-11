import type {
  Card,
  ReviewModeId,
  VocabularyCardContent,
} from "../../domain/types"
import { containsKanji } from "../../domain/types"
import { GAP_ANSWER_JOIN, normalizeGapAnswers } from "../../domain/grammarGaps"
import {
  fullyCoveredSegments,
  withWordReadingFallback,
} from "../../domain/readingsMap"
import { phraseReadingSegments } from "../../domain/vocabularyContent"
import { constructionReadingSegments } from "../../domain/grammarContent"

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
  grammar_type_reading: "Type the reading of the construction (hiragana)",
  grammar_oral_meaning: "Say the meaning of the construction",
}

/** Modes that test a hiragana reading — the IME conversion, non-hiragana
 * warning, and reading finalization on submit all apply to both. */
export function isReadingTypingMode(mode: ReviewModeId): boolean {
  return mode === "vocab_type_reading" || mode === "grammar_type_reading"
}

/**
 * Ordered per-segment reading answers for a typed reading-quiz mode, joined
 * the same way multi-gap construction answers are (comma-separated) so the
 * existing lenient comma-vs-、 grading applies uniformly. A word/construction
 * with a single reading (the common case) comes back as one un-joined part.
 */
function segmentedReadingAnswer(
  segments: { reading?: string }[] | undefined,
): string {
  return (segments ?? [])
    .filter((s) => s.reading?.trim())
    .map((s) => s.reading!)
    .join(GAP_ANSWER_JOIN)
}

export function readingForConstruction(
  construction: string,
  readings: Record<string, string>,
): string | undefined {
  // When the map fully covers the construction (e.g. a multi-cluster phrase
  // like 結論に至る with both 結論 and 至る mapped), concatenate the whole
  // reading rather than surfacing just whichever cluster happens to match —
  // returning only "けつろん" for "結論に至る" would be a wrong reading, not
  // a partial one.
  const segments = fullyCoveredSegments(construction, readings)
  if (segments) return segments.map((s) => s.reading ?? s.text).join("")

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
    mode === "grammar_type_construction" ||
    mode === "grammar_type_reading"
  )
}

/**
 * Modes whose prompt body already shows the clue prominently, making the
 * generic mode heading redundant. The heading stays in the DOM for
 * screen-reader heading navigation, just visually hidden.
 */
export function modeHeadingVisible(mode: ReviewModeId): boolean {
  return mode !== "vocab_type_word_from_clue"
}

export function expectedAnswer(card: Card, mode: ReviewModeId): string {
  if (mode === "vocab_type_reading") {
    if (card.kind !== "vocabulary") return ""
    if (card.content.reading?.trim()) return card.content.reading
    return segmentedReadingAnswer(phraseReadingSegments(card.content))
  }
  if (mode === "vocab_type_word_from_clue")
    return card.kind === "vocabulary" ? card.content.wordJa : ""
  if (mode === "grammar_type_construction")
    return card.kind === "grammar" ? card.content.construction : ""
  if (mode === "grammar_type_reading") {
    if (card.kind !== "grammar") return ""
    return segmentedReadingAnswer(constructionReadingSegments(card.content))
  }
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
  if (
    mode === "grammar_type_construction" ||
    mode === "vocab_type_reading" ||
    mode === "grammar_type_reading"
  ) {
    return normalizeGapAnswers(typed) === normalizeGapAnswers(expected)
  }
  return typed === expected
}

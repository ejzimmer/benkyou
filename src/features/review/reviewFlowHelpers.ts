import type {
  Card,
  ReviewModeId,
  VocabularyCardContent,
} from "../../domain/types"

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

export const REVIEW_MODE_LABELS: Record<ReviewModeId, string> = {
  vocab_oral_en: "Say the English meaning",
  vocab_type_reading: "Type the reading (hiragana)",
  vocab_type_word_from_clue: "Type the Japanese word",
  grammar_type_construction: "Type the construction",
  grammar_oral_meaning: "Say the English meaning of the construction",
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

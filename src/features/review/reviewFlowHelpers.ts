import type { Card, ReviewModeId } from "../../domain/types"

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

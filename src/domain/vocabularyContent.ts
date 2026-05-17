import type { VocabularyCardContent } from "./types"

export const PLACEHOLDER_DEFINITION = "[translation pending]"

export function containsKanji(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x4e00 && cp <= 0x9fff) return true
  }
  return false
}

/** True when the surface form uses only hiragana/katakana (no kanji). */
export function isKanaOnly(text: string): boolean {
  const s = text.trim()
  if (!s) return false
  for (const ch of s) {
    if (ch.trim() === "") continue
    const cp = ch.codePointAt(0)!
    const isKana =
      (cp >= 0x3040 && cp <= 0x309f) ||
      (cp >= 0x30a0 && cp <= 0x30ff) ||
      ch === "ー" ||
      ch === "・"
    if (!isKana) return false
  }
  return true
}

export function hasVocabularyEnglishDefinition(
  content: VocabularyCardContent,
): boolean {
  return content.definitionsEn.some(
    (s) =>
      s.trim().length > 0 && s.trim() !== PLACEHOLDER_DEFINITION,
  )
}

export function hasVocabularyImage(content: VocabularyCardContent): boolean {
  return content.images.length > 0
}

/** Kanji word with a hiragana reading (pronunciation) field. */
export function hasVocabularyPronunciation(
  content: VocabularyCardContent,
): boolean {
  return containsKanji(content.wordJa) && Boolean(content.reading?.trim())
}

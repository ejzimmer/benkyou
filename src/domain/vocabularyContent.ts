import type { VocabularyCardContent } from "./types"
import { fullyCoveredSegments, type ReadingSegment } from "./readingsMap"

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

/**
 * Ordered per-kanji-segment readings for a phrase-style word — e.g.
 * 結論に至る split into 結論/けつろん and 至る/いたる, from the card's own
 * phrase map — used when the word is multiple kanji clusters joined by
 * particles/okurigana rather than a single reading. Only produced when
 * `reading` is unset (that field wins for a plain single-reading word) and
 * every kanji character in `wordJa` is covered by the phrase map; otherwise
 * undefined, so callers fall back to the whole-word `reading` field.
 */
export function phraseReadingSegments(
  content: VocabularyCardContent,
): ReadingSegment[] | undefined {
  if (content.reading?.trim()) return undefined
  if (!containsKanji(content.wordJa)) return undefined
  return fullyCoveredSegments(content.wordJa, content.readings ?? {})
}

/** Kanji word with a hiragana reading (pronunciation), whole-word or per-segment. */
export function hasVocabularyPronunciation(
  content: VocabularyCardContent,
): boolean {
  if (containsKanji(content.wordJa) && Boolean(content.reading?.trim())) {
    return true
  }
  return Boolean(
    phraseReadingSegments(content)?.some((s) => s.reading?.trim()),
  )
}

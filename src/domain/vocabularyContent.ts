import type { VocabularyCardContent } from "./types"
import { segmentText, type ReadingSegment } from "./readingsMap"

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
 * Ordered per-cluster readings for a phrase-style word — e.g. 結論に至る
 * split into 結論/けつろん and 至る/いたる, from the card's own
 * `readingParts` — tested one cluster at a time instead of as one whole-
 * phrase reading. Only produced when `reading` is unset (that field wins
 * for a plain single-reading word) and there are at least two parts — a
 * single part is what the `reading` field is for. Otherwise undefined, so
 * callers fall back to the whole-word `reading` field.
 */
export function phraseReadingSegments(
  content: VocabularyCardContent,
): ReadingSegment[] | undefined {
  if (content.reading?.trim()) return undefined
  const entries = Object.entries(content.readingParts ?? {}).filter(
    ([label, reading]) => label.trim() && reading.trim(),
  )
  if (entries.length <= 1) return undefined
  return entries.map(([text, reading]) => ({ text, reading }))
}

/** Kanji word with a hiragana reading (pronunciation), whole-word or per-segment. */
export function hasVocabularyPronunciation(
  content: VocabularyCardContent,
): boolean {
  if (containsKanji(content.wordJa) && Boolean(content.reading?.trim())) {
    return true
  }
  return Boolean(phraseReadingSegments(content))
}

/**
 * Best-effort single reading string for the whole word: the explicit
 * `reading` field when set, else the phrase segments re-matched against
 * `wordJa` and concatenated with any literal characters between them (e.g.
 * the connecting に in 結論に至る) — for views that can only show one flat
 * `<ruby>` over the whole word (e.g. a character-diffed answer comparison)
 * rather than one ruby per segment.
 */
export function wordJaReading(
  content: VocabularyCardContent,
): string | undefined {
  if (content.reading?.trim()) return content.reading
  const segments = phraseReadingSegments(content)
  if (!segments) return undefined
  const byLabel = Object.fromEntries(
    segments.map((s) => [s.text, s.reading ?? ""]),
  )
  return segmentText(content.wordJa, byLabel)
    .map((s) => s.reading ?? s.text)
    .join("")
}

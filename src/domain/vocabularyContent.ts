import type { VocabularyCardContent } from "./types"
import {
  joinSegmentReadings,
  segmentText,
  type ReadingSegment,
} from "./readingsMap"

export const PLACEHOLDER_DEFINITION = "[translation pending]"

/**
 * Whether one code point is a kanji, over every block the app might see.
 *
 * Not just the main CJK Unified Ideographs block: 𠮟 (of 𠮟責) is jōyō and
 * lives outside the Basic Multilingual Plane at U+20B9F, so a check written
 * against U+4E00–U+9FFF alone reads it as two stray surrogate halves and
 * concludes the text has no kanji in it — which is how an unread 𠮟 slipped
 * into a reading assembled from a furigana map.
 *
 * Takes a whole code point (`for...of` over a string yields those, as does
 * `String.fromCodePoint`); a lone surrogate half is not kanji in any range
 * here, so callers that slice by UTF-16 unit stay as accurate as they were.
 */
export function isKanjiCodePoint(ch: string): boolean {
  const cp = ch.codePointAt(0)
  if (cp === undefined) return false
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0x3400 && cp <= 0x4dbf) || // Extension A
    (cp >= 0xf900 && cp <= 0xfaff) || // Compatibility Ideographs
    (cp >= 0x20000 && cp <= 0x3ffff) // Extension B and beyond
  )
}

export function containsKanji(s: string): boolean {
  for (const ch of s) {
    if (isKanjiCodePoint(ch)) return true
  }
  return false
}

/** Unique kanji characters across `texts`, in order of first appearance. */
export function extractKanji(texts: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const ch of texts.join("")) {
    if (isKanjiCodePoint(ch) && !seen.has(ch)) {
      seen.add(ch)
      result.push(ch)
    }
  }
  return result
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
 * single part is what the `reading` field is for.
 *
 * Deliberately does not fall back to the `readings` furigana map: under the
 * combined "Readings" field, a `phrase=reading` line is furigana only (shown
 * over the text, never quizzed) — the tested reading has to be its own
 * separator-less line, which lands in `reading`/`readingParts` instead.
 */
export function phraseReadingSegments(
  content: VocabularyCardContent,
): ReadingSegment[] | undefined {
  if (content.reading?.trim()) return undefined
  const entries = Object.entries(content.readingParts ?? {}).filter(
    ([label, reading]) => label.trim() && reading.trim(),
  )
  if (entries.length > 1) return entries.map(([text, reading]) => ({ text, reading }))
  return undefined
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
 *
 * Undefined when re-matching leaves any kanji unread — a conjugated form
 * (結論に至った against a 至る part) would otherwise produce "けつろんに至った",
 * a mixture of reading and surface text that is not this word's reading.
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
  return joinSegmentReadings(segmentText(content.wordJa, byLabel))
}

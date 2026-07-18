import type { GrammarCardContent } from "./types"
import { fullyCoveredSegments, type ReadingSegment } from "./readingsMap"

/**
 * Ordered per-cluster readings for a grammar card's construction, from the
 * card's own `constructionReadingParts` — mirrors `phraseReadingSegments`
 * for vocab words. Only produced when `constructionReading` is unset (that
 * field wins for a single-reading construction) and there are at least two
 * parts — a single part is what `constructionReading` is for.
 *
 * Falls back to deriving segments from the legacy `readings` furigana map
 * (matched against the construction's literal text) when
 * `constructionReadingParts` was never authored at all — grammar cards
 * never had a dedicated single-reading field before `constructionReading`
 * existed, so `readings` covering the construction was the only mechanism;
 * unlike the vocab fallback, a single covered segment is enough here, since
 * that's exactly the old single-word-construction case. A construction that
 * has explicitly started using `constructionReadingParts` (even with just
 * one entry so far) does not fall back.
 */
export function constructionReadingSegments(
  content: GrammarCardContent,
): ReadingSegment[] | undefined {
  if (content.constructionReading?.trim()) return undefined
  const entries = Object.entries(content.constructionReadingParts ?? {}).filter(
    ([label, reading]) => label.trim() && reading.trim(),
  )
  if (entries.length > 1) return entries.map(([text, reading]) => ({ text, reading }))
  if (entries.length === 0) {
    const legacy = fullyCoveredSegments(content.construction, content.readings)
    if (legacy?.some((s) => s.reading?.trim())) return legacy
  }
  return undefined
}

/** True when the construction has a reading to test — whole or per-cluster. */
export function hasConstructionReading(content: GrammarCardContent): boolean {
  if (content.constructionReading?.trim()) return true
  return Boolean(constructionReadingSegments(content))
}

/**
 * True when the card is reviewed one-sided (fill-in-the-gap only). Falls
 * back to a still-unmigrated `grammarPoint` string for cards saved before
 * that field was renamed to the `singleSided` boolean — Dexie/Firestore rows
 * keep whatever shape they were written with, so an old row's `grammarPoint`
 * doesn't disappear on its own, and reading only the new field would
 * silently turn every pre-existing single-sided card into a both-sides one.
 */
export function isSingleSided(content: GrammarCardContent): boolean {
  if (content.singleSided !== undefined) return content.singleSided
  const legacyGrammarPoint = (content as { grammarPoint?: string }).grammarPoint
  return Boolean(legacyGrammarPoint?.trim())
}

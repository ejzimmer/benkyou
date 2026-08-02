import type { GrammarCardContent } from "./types"
import type { ReadingSegment } from "./readingsMap"
import { countGaps } from "./grammarGaps"

/**
 * Ordered per-cluster readings for a grammar card's construction, from the
 * card's own `constructionReadingParts` — mirrors `phraseReadingSegments`
 * for vocab words. Only produced when `constructionReading` is unset (that
 * field wins for a single-reading construction) and there are at least two
 * parts — a single part is what `constructionReading` is for.
 *
 * Deliberately does not fall back to the `readings` furigana map: under the
 * combined "Readings" field, a `phrase=reading` line is furigana only (shown
 * over the sentence, never quizzed) — the tested reading has to be its own
 * separator-less line, which lands in `constructionReading`/
 * `constructionReadingParts` instead.
 */
export function constructionReadingSegments(
  content: GrammarCardContent,
): ReadingSegment[] | undefined {
  if (content.constructionReading?.trim()) return undefined
  const entries = Object.entries(content.constructionReadingParts ?? {}).filter(
    ([label, reading]) => label.trim() && reading.trim(),
  )
  if (entries.length > 1) return entries.map(([text, reading]) => ({ text, reading }))
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

/**
 * True when the sentence actually contains its own gap marker. A grammar
 * card is fundamentally a fill-in-the-gap drill — one that's missing a
 * working gap (e.g. from a bulk import that skipped validation) isn't a
 * valid fill-in-the-gap card, so it gets no review modes rather than a
 * degraded fallback UI.
 */
export function hasInlineGap(content: GrammarCardContent): boolean {
  return countGaps(content.sentenceWithGap, content.gapMarker) > 0
}

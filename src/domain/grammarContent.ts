import type { GrammarCardContent } from "./types"
import type { ReadingSegment } from "./readingsMap"

/**
 * Ordered per-cluster readings for a grammar card's construction, from the
 * card's own `constructionReadingParts` — mirrors `phraseReadingSegments`
 * for vocab words. Only produced when `constructionReading` is unset (that
 * field wins for a single-reading construction) and there are at least two
 * parts — a single part is what `constructionReading` is for.
 */
export function constructionReadingSegments(
  content: GrammarCardContent,
): ReadingSegment[] | undefined {
  if (content.constructionReading?.trim()) return undefined
  const entries = Object.entries(content.constructionReadingParts ?? {}).filter(
    ([label, reading]) => label.trim() && reading.trim(),
  )
  if (entries.length <= 1) return undefined
  return entries.map(([text, reading]) => ({ text, reading }))
}

/** True when the construction has a reading to test — whole or per-cluster. */
export function hasConstructionReading(content: GrammarCardContent): boolean {
  if (content.constructionReading?.trim()) return true
  return Boolean(constructionReadingSegments(content))
}

import type { GrammarCardContent } from "./types"
import { containsKanji } from "./vocabularyContent"
import { fullyCoveredSegments, type ReadingSegment } from "./readingsMap"

/**
 * Ordered per-kanji-segment readings for a grammar card's construction —
 * mirrors `phraseReadingSegments` for vocab words, but reads the
 * construction's segments straight from the card's `readings` map (grammar
 * cards have no separate whole-construction reading field). Undefined when
 * the construction has no kanji, or the map doesn't cover every kanji
 * character in it.
 */
export function constructionReadingSegments(
  content: GrammarCardContent,
): ReadingSegment[] | undefined {
  if (!containsKanji(content.construction)) return undefined
  return fullyCoveredSegments(content.construction, content.readings)
}

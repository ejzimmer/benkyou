import { normalizeJapanese } from "./normalize"
import type { Card } from "../../domain/types"

/**
 * Returns the confusable word/construction `typed` matches, if any — one the
 * card author flagged (via `confusedWith`) as a word they habitually mix up
 * with this card's answer. `undefined` typed input or an empty list never
 * matches.
 */
export function matchesConfusedWord(card: Card, typed: string): string | undefined {
  const t = normalizeJapanese(typed)
  if (!t) return undefined
  return card.content.confusedWith?.find((w) => normalizeJapanese(w) === t)
}

import type { Card } from "./types"

/** Whether a card matches a search box query: the Japanese side (vocab word or
 *  grammar sentence) by substring, the English side case-insensitively. Shared
 *  by the per-deck search and the all-decks search on the deck list. */
export function cardMatchesQuery(card: Card, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const n = q.toLowerCase()
  if (card.kind === "vocabulary") {
    return (
      card.content.wordJa.includes(q) ||
      card.content.definitionsEn.some((d) => d.toLowerCase().includes(n))
    )
  }
  return (
    card.content.sentenceWithGap.includes(q) ||
    card.content.translationEn.toLowerCase().includes(n)
  )
}

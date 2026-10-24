import type { Card } from "./types"

/** Every text field a search can match: the Japanese side (vocab word or
 *  grammar sentence), the answer (meanings, or the grammar construction and its
 *  accepted alternatives), the hiragana readings, example sentences and the
 *  English translation. */
function searchableText(card: Card): string[] {
  if (card.kind === "vocabulary") {
    const v = card.content
    return [
      v.wordJa,
      ...v.definitionsEn,
      v.reading ?? "",
      ...Object.values(v.readingParts ?? {}),
      ...Object.values(v.readings ?? {}),
      ...v.exampleSentences,
      ...(v.alternateAnswers ?? []),
    ]
  }
  const g = card.content
  return [
    g.sentenceWithGap,
    g.construction,
    ...(g.alternateAnswers ?? []),
    g.constructionReading ?? "",
    ...Object.values(g.constructionReadingParts ?? {}),
    ...Object.values(g.readings ?? {}),
    g.translationEn,
  ]
}

/** Whether a card matches a search box query, by case-insensitive substring
 *  against any of its text fields. */
export function cardMatchesQuery(card: Card, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return searchableText(card).some((text) => text.toLowerCase().includes(q))
}

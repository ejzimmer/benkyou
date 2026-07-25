import type { Card, GrammarCardContent, VocabularyCardContent } from "./types"
import { normalizeJapanese } from "../lib/japanese/normalize"

/** The Japanese headword used to search for duplicates of this card. */
export function japaneseWordForCard(card: Card): string {
  return card.kind === "vocabulary" ? card.content.wordJa : card.content.construction
}

function vocabularyTextFields(content: VocabularyCardContent): string[] {
  return [
    content.wordJa,
    content.reading ?? "",
    ...Object.values(content.readings ?? {}),
    ...content.definitionsEn,
    ...content.exampleSentences,
  ]
}

function grammarTextFields(content: GrammarCardContent): string[] {
  return [
    content.sentenceWithGap,
    content.construction,
    content.translationEn,
    ...Object.values(content.readings),
  ]
}

export function cardTextFields(card: Card): string[] {
  return card.kind === "vocabulary"
    ? vocabularyTextFields(card.content)
    : grammarTextFields(card.content)
}

/**
 * Other cards that might be duplicates of `card` — any of their fields
 * contains `card`'s Japanese word/construction as a substring.
 */
export function findDuplicateCards(card: Card, allCards: Card[]): Card[] {
  const term = normalizeJapanese(japaneseWordForCard(card))
  if (!term) return []
  return allCards.filter(
    (other) =>
      other.id !== card.id &&
      cardTextFields(other).some((field) => normalizeJapanese(field).includes(term)),
  )
}

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
 * True once the user has confirmed the two cards aren't duplicates of each
 * other. The mark is written to both cards, but either side alone is enough
 * to suppress the pair — one card can lose its copy (an older device winning
 * a sync conflict, a merge) without the dismissal springing back.
 */
export function isMarkedNotDuplicate(card: Card, other: Card): boolean {
  return (
    (card.notDuplicateOf?.includes(other.id) ?? false) ||
    (other.notDuplicateOf?.includes(card.id) ?? false)
  )
}

/**
 * Cards whose text contains `card`'s Japanese word/construction as a
 * substring — the raw duplicate candidates, including any the user has since
 * marked as not duplicates.
 */
export function findDuplicateCandidates(card: Card, allCards: Card[]): Card[] {
  const term = normalizeJapanese(japaneseWordForCard(card))
  if (!term) return []
  return allCards.filter(
    (other) =>
      other.id !== card.id &&
      cardTextFields(other).some((field) => normalizeJapanese(field).includes(term)),
  )
}

export type DuplicatePartition = {
  /** Candidates still worth reporting as possible duplicates. */
  matches: Card[]
  /**
   * Candidates the user has confirmed aren't duplicates. Returned rather
   * than dropped so a mis-click stays reversible: with the pair otherwise
   * invisible, these are the only cards a "this really is a duplicate"
   * control can restore.
   */
  dismissed: Card[]
}

/**
 * Split `card`'s duplicate candidates by the user's verdict, in one pass —
 * the substring search NFKC-normalizes every field of every card, so it's
 * worth not running twice for the two halves of the same answer.
 */
export function partitionDuplicateCards(
  card: Card,
  allCards: Card[],
): DuplicatePartition {
  const matches: Card[] = []
  const dismissed: Card[] = []
  for (const candidate of findDuplicateCandidates(card, allCards)) {
    ;(isMarkedNotDuplicate(card, candidate) ? dismissed : matches).push(candidate)
  }
  return { matches, dismissed }
}

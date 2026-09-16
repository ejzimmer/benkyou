import type { Card, GrammarCardContent, VocabularyCardContent } from "./types"
import { normalizeJapanese } from "../lib/japanese/normalize"
import { annotatedSegments, joinSegmentReadings } from "./readingsMap"

/** The Japanese headword used to search for duplicates of this card. */
export function japaneseWordForCard(card: Card): string {
  return card.kind === "vocabulary" ? card.content.wordJa : card.content.construction
}

/**
 * The headword's own reading, as recorded in the card's furigana map.
 *
 * The map holds furigana for both the headword and the card's example/gap
 * sentence, so it can't be searched wholesale — any word the sentence
 * happens to use would match. But it can't be ignored either: a card whose
 * reading was only ever authored as furigana (no `reading` field) would have
 * no reading to match on at all.
 *
 * So tokenize the headword against the map, exactly as the furigana renderer
 * does, and keep the whole-word reading that falls out. That reads the map
 * as authored: 頻繁 entered one kanji per line ({頻: ひん, 繁: ぱん}, the
 * shape `addMissingKanjiLines` seeds) joins back to ひんぱん, and okurigana
 * left un-annotated (至る with {至: いた}) is carried through as itself.
 *
 * `readingParts` gets the same treatment, for the same reason: its
 * per-cluster fragments ({結論: けつろん, 至る: いたる}) only match a kana
 * card once joined into けつろんにいたる.
 * Entries belonging to the sentence simply don't match the headword, and a
 * map that leaves any of the headword's kanji unread yields nothing rather
 * than a half-reading — so a sentence's 人=ひと can't turn 大人 into おおひと.
 */
function headwordFuriganaReading(
  headword: string,
  readings: Record<string, string> | undefined,
): string[] {
  if (!headword.trim() || !readings) return []
  const joined = joinSegmentReadings(annotatedSegments(headword, readings))
  return joined ? [joined] : []
}

function vocabularyIdentityFields(content: VocabularyCardContent): string[] {
  return [
    content.wordJa,
    content.reading ?? "",
    ...headwordFuriganaReading(content.wordJa, content.readingParts),
    ...headwordFuriganaReading(content.wordJa, content.readings),
  ]
}

function grammarIdentityFields(content: GrammarCardContent): string[] {
  return [
    content.construction,
    content.constructionReading ?? "",
    ...headwordFuriganaReading(
      content.construction,
      content.constructionReadingParts,
    ),
    ...headwordFuriganaReading(content.construction, content.readings),
  ]
}

/**
 * The text that says what a card *teaches* — its headword/construction and
 * that word's own reading — and nothing else.
 *
 * Deliberately excludes everything that merely supports the headword:
 * example sentences, the fill-in-the-gap sentence, and English definitions
 * and translations. Two cards sharing one of those are not duplicates — a
 * 交換 card whose sentence happens to use 頻繁, and a 頻繁 card whose
 * example sentence happens to use 交換, teach different words and were being
 * flagged for each other in both directions.
 *
 * The `readings` furigana map spans both, since it annotates the headword
 * and the sentence alike; `headwordFuriganaReading` takes the headword's
 * part of it and leaves the sentence's behind.
 */
export function cardIdentityFields(card: Card): string[] {
  return card.kind === "vocabulary"
    ? vocabularyIdentityFields(card.content)
    : grammarIdentityFields(card.content)
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
 * A card's identity fields, normalized and joined into one haystack, cached
 * per card object. A review session scans the whole table once per card
 * shown, and NFKC-normalizing every field of every card each time is the
 * bulk of that work; Dexie hands back a fresh object whenever a card
 * actually changes, so identity is a safe cache key and stale entries are
 * collected.
 *
 * NUL separates the fields: no Japanese term can contain one, so joining
 * can't create a match that spans two fields.
 */
const normalizedTextCache = new WeakMap<Card, string>()

function normalizedCardText(card: Card): string {
  const cached = normalizedTextCache.get(card)
  if (cached !== undefined) return cached
  const text = cardIdentityFields(card).map(normalizeJapanese).join("\u0000")
  normalizedTextCache.set(card, text)
  return text
}

const normalizedTermCache = new WeakMap<Card, string>()

function normalizedTerm(card: Card): string {
  const cached = normalizedTermCache.get(card)
  if (cached !== undefined) return cached
  const term = normalizeJapanese(japaneseWordForCard(card))
  normalizedTermCache.set(card, term)
  return term
}

/**
 * Cards whose headword (or its reading) contains `card`'s Japanese
 * word/construction as a substring, or vice versa — the raw duplicate
 * candidates, including any the user has since marked as not duplicates.
 *
 * Containment is checked both ways round because "these two might be the
 * same word" is a symmetric claim: 結論 contains nothing of 結論に至る, so
 * checking one way only would report the pair while reviewing 結論 and stay
 * silent while reviewing 結論に至る. The dismissal that answers the report
 * is symmetric too, so the report itself has to be.
 *
 * Still a substring match rather than an exact one, so a card for a phrase
 * built on the same word is worth a look; it's the *fields* searched, not
 * the looseness of the match, that decides whether two cards are about the
 * same word.
 */
export function findDuplicateCandidates(card: Card, allCards: Card[]): Card[] {
  const term = normalizedTerm(card)
  if (!term) return []
  const text = normalizedCardText(card)
  return allCards.filter((other) => {
    if (other.id === card.id) return false
    if (normalizedCardText(other).includes(term)) return true
    const otherTerm = normalizedTerm(other)
    return Boolean(otherTerm) && text.includes(otherTerm)
  })
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

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

function vocabularyReadings(content: VocabularyCardContent): string[] {
  return [
    content.reading ?? "",
    ...headwordFuriganaReading(content.wordJa, content.readingParts),
    ...headwordFuriganaReading(content.wordJa, content.readings),
  ]
}

function grammarReadings(content: GrammarCardContent): string[] {
  return [
    content.constructionReading ?? "",
    ...headwordFuriganaReading(
      content.construction,
      content.constructionReadingParts,
    ),
    ...headwordFuriganaReading(content.construction, content.readings),
  ]
}

export type CardIdentity = {
  /** The headword/construction itself, as written. */
  headword: string
  /** Whole-word readings of that headword, however they were authored. */
  readings: string[]
}

/**
 * What a card *teaches* — its headword/construction and that word's own
 * reading — and nothing else.
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
 *
 * Headword and readings are kept apart because they are matched differently
 * — see `findDuplicateCandidates`.
 */
export function cardIdentity(card: Card): CardIdentity {
  const headword = japaneseWordForCard(card)
  const readings = (
    card.kind === "vocabulary"
      ? vocabularyReadings(card.content)
      : grammarReadings(card.content)
  ).filter((reading) => reading.trim())
  return { headword, readings }
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
 * A card's identity, normalized, cached per card object. A review session
 * scans the whole table once per card shown, and NFKC-normalizing every
 * field of every card each time is the bulk of that work; Dexie hands back a
 * fresh object whenever a card actually changes, so identity is a safe cache
 * key and stale entries are collected.
 */
const normalizedIdentityCache = new WeakMap<Card, CardIdentity>()

function normalizedIdentity(card: Card): CardIdentity {
  const cached = normalizedIdentityCache.get(card)
  if (cached !== undefined) return cached
  const { headword, readings } = cardIdentity(card)
  const identity = {
    headword: normalizeJapanese(headword),
    readings: readings.map(normalizeJapanese).filter(Boolean),
  }
  normalizedIdentityCache.set(card, identity)
  return identity
}

/**
 * Cards that might be teaching the same word as `card` — the raw duplicate
 * candidates, including any the user has since marked as not duplicates.
 *
 * Two ways to qualify, matched differently on purpose:
 *
 * - **Headword against headword, as a substring either way round.** A card
 *   for a phrase built on the same word (結論 against 結論に至る, 猫 against
 *   子猫) is worth a look. Both directions, because "these might be the same
 *   word" is a symmetric claim and so is the dismissal that answers it —
 *   checking one way only would report the pair while reviewing 結論 and go
 *   silent while reviewing 結論に至る.
 * - **Headword against the other card's reading, exactly.** This is what
 *   pairs a kana card with the kanji card it spells out (ひんぱん against
 *   頻繁). Exactly, because a reading identifies *the same word* written in
 *   kana — not any word whose kana happen to contain it. Loosened to a
 *   substring it matches on syllable coincidence, and a two-kana grammar
 *   card sweeps up half the deck: こと would flag 異なる (ことなる) and 誠
 *   (まこと), たら would flag 働く (はたらく) and 新しい (あたらしい).
 *
 * Reading against reading is not a match: same reading, different kanji is a
 * homophone (橋 against 箸), not a duplicate. Two cards for the genuinely
 * same word already share a headword.
 */
export function findDuplicateCandidates(card: Card, allCards: Card[]): Card[] {
  const { headword, readings } = normalizedIdentity(card)
  if (!headword) return []
  return allCards.filter((other) => {
    if (other.id === card.id) return false
    const otherIdentity = normalizedIdentity(other)
    if (!otherIdentity.headword) return false
    if (
      otherIdentity.headword.includes(headword) ||
      headword.includes(otherIdentity.headword)
    ) {
      return true
    }
    return (
      otherIdentity.readings.includes(headword) ||
      readings.includes(otherIdentity.headword)
    )
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

import type { Card, GrammarCardContent, VocabularyCardContent } from "./types"
import { normalizeJapanese } from "../lib/japanese/normalize"
import { annotatedSegments, joinSegmentReadings } from "./readingsMap"
import { containsKanji } from "./vocabularyContent"

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
 *
 * Entries belonging to the sentence simply don't match the headword, and a
 * map that leaves any of the headword's kanji unread yields nothing rather
 * than a half-reading.
 */
function headwordFuriganaReading(
  headword: string,
  readings: Record<string, string> | undefined,
): string | undefined {
  if (!headword.trim() || !readings) return undefined
  return joinSegmentReadings(annotatedSegments(headword, readings))
}

/**
 * The card's own reading for its headword, in the order the card records it:
 * the explicit reading field first, then the author's per-cluster breakdown,
 * and only then the furigana map.
 *
 * The order matters because the furigana map is shared with the card's
 * sentence, so a reading derived from it can disagree with the one the card
 * actually teaches — 一日 read ついたち, with per-kanji entries {一: いち,
 * 日: にち} left over from a sentence, derives いちにち; 大人 read おとな
 * with {大: おお, 人: ひと} derives おおひと. Neither is a reading this card
 * teaches, and matching on one invents duplicates. The map is the fallback
 * for a card that has no reading of its own, not a second opinion about a
 * card that does — and `furigana` is passed only when the map can't have
 * picked up a sentence's readings in the first place (see the callers).
 */
function headwordReading(
  headword: string,
  explicit: string | undefined,
  parts: Record<string, string> | undefined,
  furigana: Record<string, string> | undefined,
): string[] {
  const reading =
    (explicit?.trim() ? explicit : undefined) ??
    headwordFuriganaReading(headword, parts) ??
    headwordFuriganaReading(headword, furigana)
  return reading ? [reading] : []
}

function vocabularyReadings(content: VocabularyCardContent): string[] {
  // With no example sentences there is nothing else the furigana map can be
  // annotating, so it's safe to read a headword reading out of it. With
  // sentences present it's a mixture, and a reading derived from it may be
  // one of the *sentence's* words' readings rather than the headword's.
  const sentenceFree = !content.exampleSentences.some((line) => line.trim())
  return headwordReading(
    content.wordJa,
    content.reading,
    content.readingParts,
    sentenceFree ? content.readings : undefined,
  )
}

function grammarReadings(content: GrammarCardContent): string[] {
  // A fill-in-the-gap card's `readings` map is documented as furigana for
  // the sentence, and its construction is the gap's answer rather than part
  // of that sentence — so the map is never a source for this headword's
  // reading. `constructionReadingParts` is the card's own breakdown.
  return headwordReading(
    content.construction,
    content.constructionReading,
    content.constructionReadingParts,
    undefined,
  )
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
 * scans the whole table once per card shown, and deriving each card's
 * identity — tokenizing its headword against its furigana map, then NFKC
 * normalization — is the bulk of that work; Dexie hands back a fresh object
 * whenever a card actually changes, so identity is a safe cache key and
 * stale entries are collected.
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
 * True when `headword` appearing inside `container` is worth reporting.
 *
 * Only a headword containing kanji may match as a substring. A kanji is a
 * word in itself, so a longer word built around one is worth a second look —
 * 猫 inside 子猫, 結論 inside 結論に至る. Kana are syllables, and a short
 * kana word lands inside unrelated longer ones constantly, in either script:
 * こと inside ことわざ and に inside にんじん, but equally パン inside パンダ
 * and ジャパン, カメ inside カメラ. A kana-only headword therefore has to
 * match in full — which does cost the odd real pair (ペン inside ボールペン),
 * but those are rarer than the collisions, and the pair is still reported
 * when the two cards genuinely share a word.
 */
function headwordContains(container: string, headword: string): boolean {
  return containsKanji(headword) && container.includes(headword)
}

/**
 * Cards that might be teaching the same word as `card` — the raw duplicate
 * candidates, including any the user has since marked as not duplicates.
 *
 * Three ways to qualify:
 *
 * - **The same headword.** Always, whatever it's written in.
 * - **One headword inside the other**, either way round, and only for a
 *   headword with kanji in it (see `headwordContains`). Both directions,
 *   because "these might be the same word" is a symmetric claim and so is
 *   the dismissal that answers it — checking one way only would report the
 *   pair while reviewing 結論 and go silent while reviewing 結論に至る.
 * - **A headword equal to the other card's reading.** This is what pairs a
 *   kana card with the kanji card it spells out (ひんぱん against 頻繁).
 *   Equal, not contained, for the same reason kana headwords must match in
 *   full: readings are all kana, so containment there is syllable
 *   coincidence — こと would flag 異なる (ことなる) and 誠 (まこと).
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
    if (otherIdentity.headword === headword) return true
    if (
      headwordContains(otherIdentity.headword, headword) ||
      headwordContains(headword, otherIdentity.headword)
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
 * the search walks the whole table, so it's worth not running twice for the
 * two halves of the same answer.
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

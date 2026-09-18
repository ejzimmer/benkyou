import type { Card } from "./types"
import { normalizeJapanese } from "../lib/japanese/normalize"
import { annotatedSegments, joinSegmentReadings } from "./readingsMap"
import { splitGapAnswers } from "./grammarGaps"

/** The Japanese headword shown for this card in the duplicates list. */
export function japaneseWordForCard(card: Card): string {
  return card.kind === "vocabulary" ? card.content.wordJa : card.content.construction
}

/**
 * The words a card teaches. Usually one — but a fill-in-the-gap card with
 * several gaps stores its answers comma-joined in `construction`
 * (`normalizeGapAnswers`), and "こと, もの" is two words, not a word. Left
 * joined it can never equal another card's headword, so a card for either
 * answer alone would never be reported.
 */
function cardHeadwords(card: Card): string[] {
  if (card.kind === "vocabulary") return [card.content.wordJa]
  return splitGapAnswers(card.content.construction)
}

/**
 * The reading a card teaches for `headword`, as the card itself records it.
 *
 * `parts` is the author's per-cluster breakdown, which serves double duty:
 * one entry per gap answer on a multi-gap card (so a direct lookup finds
 * this headword's own reading), or one per kanji cluster of a single word
 * (結論に至る as {結論: けつろん, 至る: いたる}), which has to be joined back
 * into けつろんにいたる before it can match a kana card. Tokenizing the
 * headword against the map covers both, and carries un-annotated okurigana
 * through as itself (至る with {至: いた} → いたる).
 *
 * The card's `readings` furigana map is deliberately not consulted. It
 * annotates the headword and the card's sentence alike — the editor seeds it
 * from both — and records nothing about which entry came from where, so a
 * reading assembled from it is a guess: 大人 with {大: おお, 人: ひと} would
 * give おおひと, 明日 with {明: めい, 日: にち} would give めいにち and flag
 * a 命日 card. A card with no reading of its own teaches no reading, so
 * there is nothing there worth guessing at.
 */
function headwordReading(
  headword: string,
  explicit: string | undefined,
  parts: Record<string, string> | undefined,
): string | undefined {
  if (explicit?.trim()) return explicit
  if (!headword.trim() || !parts) return undefined
  // `Object.hasOwn`, not a bare lookup: a headword like "toString" would
  // otherwise resolve to the inherited function and throw on `.trim()`.
  const own = Object.hasOwn(parts, headword) ? parts[headword] : undefined
  if (own?.trim()) return own
  return joinSegmentReadings(annotatedSegments(headword, parts))
}

/**
 * The card's reading field, lined up one-to-one with its headwords.
 *
 * With a single headword the field is that word's reading, whatever is in
 * it. With several gap answers the editor writes their readings into the
 * same field comma-joined, in gap order — the convention `answersMatch`
 * already grades against — so it splits positionally. A field that doesn't
 * split into one reading per gap says nothing reliable about any single
 * answer, so none of it is used.
 */
function readingsPerHeadword(
  explicit: string | undefined,
  headwords: string[],
): (string | undefined)[] {
  if (headwords.length <= 1) return [explicit]
  const split = splitGapAnswers(explicit ?? "")
  return split.length === headwords.length ? split : []
}

function cardReadings(card: Card, headwords: string[]): string[] {
  const [explicit, parts] =
    card.kind === "vocabulary"
      ? [card.content.reading, card.content.readingParts]
      : [card.content.constructionReading, card.content.constructionReadingParts]
  const perHeadword = readingsPerHeadword(explicit, headwords)
  return headwords
    .map((headword, i) => headwordReading(headword, perHeadword[i], parts))
    .filter((reading): reading is string => Boolean(reading?.trim()))
}

export type CardIdentity = {
  /** The word(s) this card teaches, as written. */
  headwords: string[]
  /** Whole-word readings of those headwords, as the card records them. */
  readings: string[]
}

/**
 * What a card *teaches* — the word(s) it drills and their own readings — and
 * nothing else.
 *
 * Deliberately excludes everything that merely supports the headword:
 * example sentences, the fill-in-the-gap sentence, English definitions and
 * translations, and the furigana map (see `headwordReading`). Two cards
 * sharing one of those are not duplicates — a 交換 card whose sentence
 * happens to use 頻繁, and a 頻繁 card whose example sentence happens to use
 * 交換, teach different words and were being flagged for each other in both
 * directions.
 *
 * Headwords and readings are kept apart because they are matched differently
 * — see `findDuplicateCandidates`.
 */
/**
 * A field's text plus any "/"-separated alternates it lists — the authoring
 * convention `answersMatch` grades against, where 食べる/食べます accepts
 * either. A card writing one of those teaches both, so both have to count
 * as its identity, or it never pairs with a card for either alone.
 *
 * The raw text stays in the list because a lone "/" is ordinary text rather
 * than a separator (a card for "1/2" still matches another "1/2" card), and
 * a single non-empty part means there was no alternate list to begin with.
 */
function withAlternates(text: string): string[] {
  const parts = text
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? [text, ...parts] : [text]
}

export function cardIdentity(card: Card): CardIdentity {
  // Readings are derived before alternates are expanded: `cardReadings`
  // pairs a multi-gap card's reading field positionally with its gap
  // answers, and expanding "食べる/食べます" into two entries first would
  // throw that alignment out.
  const perGap = cardHeadwords(card).filter((word) => word.trim())
  const readings = cardReadings(card, perGap)
  return {
    headwords: perGap.flatMap(withAlternates).filter((word) => word.trim()),
    readings: readings.flatMap(withAlternates).filter((word) => word.trim()),
  }
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
 * identity — tokenizing its headword against its reading parts, then NFKC
 * normalization — is the bulk of that work; Dexie hands back a fresh object
 * whenever a card actually changes, so identity is a safe cache key and
 * stale entries are collected.
 */
const normalizedIdentityCache = new WeakMap<Card, CardIdentity>()

function normalizedIdentity(card: Card): CardIdentity {
  const cached = normalizedIdentityCache.get(card)
  if (cached !== undefined) return cached
  const { headwords, readings } = cardIdentity(card)
  const identity = {
    headwords: headwords.map(normalizeJapanese).filter(Boolean),
    readings: readings.map(normalizeJapanese).filter(Boolean),
  }
  normalizedIdentityCache.set(card, identity)
  return identity
}

/**
 * Characters that continue a kanji run without being kanji themselves: the
 * iteration marks 々 and 〆, and the small ヶ/ヵ that stand in for 箇 in
 * counters. Treated as kanji for the boundary test only — 時々 is one word,
 * so a 時 card has no business being reported against it, and the ヶ in
 * 一ヶ月 doesn't make 月 a word of its own there.
 *
 * Kept local rather than widened into `containsKanji`, whose other callers
 * (`extractKanji`, `hasVocabularyPronunciation`, the reading-field
 * validation in `services/cards.ts`) all want kanji proper.
 */
const KANJI_RUN_MARKS = "々〆ヶヵ"

/**
 * Kanji by code point, over every block the app might see — including the
 * non-BMP ones `containsKanji` misses (𠮟 of 𠮟責 is jōyō and lives at
 * U+20B9F). Read as a surrogate half, such a kanji looks like a run break
 * and lets 責 match 𠮟責, which is the very fragment-matching this is here
 * to stop.
 */
function isKanjiCodePoint(ch: string): boolean {
  const cp = ch.codePointAt(0)
  if (cp === undefined) return false
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0x3400 && cp <= 0x4dbf) || // Extension A
    (cp >= 0xf900 && cp <= 0xfaff) || // Compatibility Ideographs
    (cp >= 0x20000 && cp <= 0x3ffff) // Extension B and beyond
  )
}

function continuesKanjiRun(ch: string): boolean {
  // "" stands for "past the end of the string", which is a boundary — and
  // `String.includes("")` is true, so it has to be rejected up front.
  if (!ch) return false
  return isKanjiCodePoint(ch) || KANJI_RUN_MARKS.includes(ch)
}

function hasKanji(text: string): boolean {
  for (const ch of text) if (isKanjiCodePoint(ch)) return true
  return false
}

/** The whole code point starting at `at`, or "" past the end. */
function codePointAt(text: string, at: number): string {
  if (at < 0 || at >= text.length) return ""
  const cp = text.codePointAt(at)
  return cp === undefined ? "" : String.fromCodePoint(cp)
}

/** The whole code point ending just before `at`, or "" at the start. */
function codePointBefore(text: string, at: number): string {
  if (at <= 0) return ""
  const low = text.charCodeAt(at - 1)
  if (low >= 0xdc00 && low <= 0xdfff && at >= 2) {
    const high = text.charCodeAt(at - 2)
    if (high >= 0xd800 && high <= 0xdbff) return text.slice(at - 2, at)
  }
  return text[at - 1] ?? ""
}

/**
 * True when `headword` appearing inside `container` is worth reporting.
 *
 * Two conditions, both about not mistaking a fragment for a word.
 *
 * The headword must contain kanji. Kana are syllables, and a short kana word
 * lands inside unrelated longer ones constantly, in either script: こと
 * inside ことわざ and に inside にんじん, but equally パン inside パンダ and
 * ジャパン, カメ inside カメラ. A kana-only headword has to match in full.
 *
 * And it must sit on kanji-block boundaries — nothing continuing a kanji run
 * immediately either side of it (see `continuesKanjiRun`). A run of kanji is
 * one word: 大人 is not 大 plus 人, 日本語 is not 日 plus 本 plus 語, and a
 * 人 or 日 card has no business being reported against them. Break the run
 * with kana and it's a phrase rather than a word, and its parts are words in
 * their own right: 結論 and 至る are each worth reporting against 結論に至る.
 * This does mean a compound never matches its own parts (子猫 no longer
 * reports 猫), which is the same judgement as 大人/人 — only the familiar
 * ones look like they should pair.
 */
function headwordContains(container: string, headword: string): boolean {
  if (!hasKanji(headword)) return false
  const firstChar = codePointAt(headword, 0)
  const lastChar = codePointBefore(headword, headword.length)
  for (
    let at = container.indexOf(headword);
    at >= 0;
    at = container.indexOf(headword, at + 1)
  ) {
    // A seam only cuts a run when *both* of its sides are part of one. The
    // headword's own edge matters as much as the character next to it: 至る
    // ends in kana, so the 所 after it in 至る所 begins a new run rather than
    // continuing the headword's, and the two are still separate words.
    const cutAtStart =
      continuesKanjiRun(firstChar) &&
      continuesKanjiRun(codePointBefore(container, at))
    const cutAtEnd =
      continuesKanjiRun(lastChar) &&
      continuesKanjiRun(codePointAt(container, at + headword.length))
    if (!cutAtStart && !cutAtEnd) return true
  }
  return false
}

/**
 * Cards that might be teaching the same word as `card` — the raw duplicate
 * candidates, including any the user has since marked as not duplicates.
 *
 * Any of a card's headwords qualifying is enough, since a multi-gap card
 * teaches each of its answers. Three ways to qualify:
 *
 * - **The same headword.** Always, whatever it's written in.
 * - **One headword inside the other**, either way round, as a whole kanji
 *   block (see `headwordContains`). Both directions,
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
  const { headwords, readings } = normalizedIdentity(card)
  if (headwords.length === 0) return []
  return allCards.filter((other) => {
    if (other.id === card.id) return false
    const otherIdentity = normalizedIdentity(other)
    // Doesn't vary with `headword`, so it's settled once rather than
    // re-scanned inside the loop below.
    if (otherIdentity.headwords.some((word) => readings.includes(word))) {
      return true
    }
    return headwords.some(
      (headword) =>
        otherIdentity.headwords.some(
          (otherHeadword) =>
            otherHeadword === headword ||
            headwordContains(otherHeadword, headword) ||
            headwordContains(headword, otherHeadword),
        ) || otherIdentity.readings.includes(headword),
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

import type {
  Card,
  GrammarCardContent,
  VocabularyCardContent,
} from "../domain/types"
import {
  hasVocabularyEnglishDefinition,
  hasVocabularyImage,
  hasVocabularyPronunciation,
  isKanaOnly,
  phraseReadingSegments,
} from "../domain/vocabularyContent"
import { constructionReadingSegments, isSingleSided } from "../domain/grammarContent"
import { containsKanji, reviewModesForCard } from "../domain/types"
import {
  countGaps,
  normalizeGapAnswers,
  splitGapAnswers,
} from "../domain/grammarGaps"
import { db, type SchedulingRow } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import {
  deserializeFsrs,
  emptyFsrs,
  isSuspendedDue,
  serializeFsrs,
} from "../lib/srs/schedule"
import { recordTombstone } from "../lib/sync/tombstones"
import { markCardEdited, removeSessionEditedCardIds } from "../lib/sync/sessionEdits"

export function validateVocabulary(content: VocabularyCardContent): string | null {
  if (!content.wordJa.trim()) return "Japanese word is required"
  if (isKanaOnly(content.wordJa) && content.reading?.trim()) {
    return "Pronunciation (reading) is only for words that contain kanji"
  }
  if (content.reading?.trim() && !containsKanji(content.wordJa)) {
    return "Pronunciation (reading) is only for words that contain kanji"
  }
  const hasPronunciation = hasVocabularyPronunciation(content)
  const hasEnglish = hasVocabularyEnglishDefinition(content)
  const hasImg = hasVocabularyImage(content)
  if (!hasPronunciation && !hasEnglish && !hasImg) {
    return "Add at least one pronunciation (reading), meaning, or image"
  }
  return null
}

export function validateGrammar(content: GrammarCardContent): string | null {
  if (!content.sentenceWithGap.trim()) return "Sentence is required"
  if (!content.construction.trim()) return "Construction is required"
  // A translation/image isn't required — a sentence + construction is
  // already a complete fill-in-the-gap drill; not every card needs English.
  const gap = content.gapMarker.trim() || "___"
  if (!content.sentenceWithGap.includes(gap))
    return `Sentence must contain the gap marker (${gap})`
  const gapCount = countGaps(content.sentenceWithGap, gap)
  if (gapCount > 1) {
    const answerCount = splitGapAnswers(content.construction).length
    if (answerCount !== gapCount) {
      return `This sentence has ${gapCount} gaps — provide ${gapCount} answers separated by a comma (, or 、)`
    }
  }
  return null
}

/**
 * Canonicalize a multi-gap fill-in-the-gap card's construction so its
 * per-gap answers are consistently comma-separated (accepting "," or "、" as
 * authored), regardless of how the user typed the separator. Single-gap
 * cards are left untouched — their construction is one answer, which may
 * legitimately contain "、" as ordinary Japanese punctuation rather than an
 * answer separator (e.g. a "〜たり、〜たり" construction).
 */
export function normalizeGrammarContent(
  content: GrammarCardContent,
): GrammarCardContent {
  const gap = content.gapMarker.trim() || "___"
  if (countGaps(content.sentenceWithGap, gap) <= 1) return content
  return { ...content, construction: normalizeGapAnswers(content.construction) }
}

function schedulingId(cardId: string, modeId: string) {
  return `${cardId}:${modeId}`
}

export async function ensureSchedulingForCard(card: Card): Promise<void> {
  const modes = new Set(reviewModesForCard(card))
  const now = Date.now()
  const existingRows = await db.scheduling
    .where("cardId")
    .equals(card.id)
    .toArray()
  for (const r of existingRows) {
    if (!modes.has(r.modeId)) {
      await db.scheduling.delete(r.id)
    }
  }
  for (const modeId of modes) {
    const id = schedulingId(card.id, modeId)
    const existing = await db.scheduling.get(id)
    if (!existing) {
      const fsrsCard = emptyFsrs()
      const row: SchedulingRow = {
        id,
        cardId: card.id,
        modeId,
        fsrs: serializeFsrs(fsrsCard),
        due: fsrsCard.due.getTime(),
        updatedAt: now,
      }
      await db.scheduling.put(row)
    }
  }
}

export async function saveCard(card: Card): Promise<void> {
  await db.cards.put(card)
  await ensureSchedulingForCard(card)
  markCardEdited(card.id)
}

function concatText(a: string, b: string): string {
  const at = a.trim()
  const bt = b.trim()
  if (!at) return bt
  if (!bt) return at
  if (at === bt) return at
  return `${at}; ${bt}`
}

function mergeImages(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])]
}

function mergeReadings(
  target: Record<string, string>,
  source: Record<string, string>,
): Record<string, string> {
  const readings = { ...target }
  for (const [phrase, reading] of Object.entries(source)) {
    readings[phrase] = readings[phrase]
      ? concatText(readings[phrase], reading)
      : reading
  }
  return readings
}

function mergeVocabularyContent(
  target: VocabularyCardContent,
  source: VocabularyCardContent,
): VocabularyCardContent {
  const reading = concatText(target.reading ?? "", source.reading ?? "")
  return {
    wordJa: concatText(target.wordJa, source.wordJa),
    reading: reading || undefined,
    readingParts: mergeReadings(
      target.readingParts ?? {},
      source.readingParts ?? {},
    ),
    readings: mergeReadings(target.readings ?? {}, source.readings ?? {}),
    definitionsEn: [...target.definitionsEn, ...source.definitionsEn],
    images: mergeImages(target.images, source.images),
    exampleSentences: [...target.exampleSentences, ...source.exampleSentences],
    confusedWith: mergeConfusedWith(target.confusedWith, source.confusedWith),
  }
}

function mergeGrammarContent(
  target: GrammarCardContent,
  source: GrammarCardContent,
): GrammarCardContent {
  const constructionReading = concatText(
    target.constructionReading ?? "",
    source.constructionReading ?? "",
  )
  return {
    sentenceWithGap: concatText(target.sentenceWithGap, source.sentenceWithGap),
    gapMarker: target.gapMarker,
    construction: concatText(target.construction, source.construction),
    constructionReading: constructionReading || undefined,
    constructionReadingParts: mergeReadings(
      target.constructionReadingParts ?? {},
      source.constructionReadingParts ?? {},
    ),
    translationEn: concatText(target.translationEn, source.translationEn),
    readings: mergeReadings(target.readings, source.readings),
    images: mergeImages(target.images, source.images),
    singleSided: isSingleSided(target) || isSingleSided(source),
    confusedWith: mergeConfusedWith(target.confusedWith, source.confusedWith),
  }
}

/** Union of both cards' flagged confusable words, deduped. */
function mergeConfusedWith(
  target: string[] | undefined,
  source: string[] | undefined,
): string[] {
  return [...new Set([...(target ?? []), ...(source ?? [])])]
}

/**
 * Merge `source`'s fields into `target`, concatenating fields that both cards
 * have a value for (the caller can clean up the concatenated text afterwards).
 * `source` is converted to `target`'s kind first if the two cards differ.
 */
export function mergeCardContent(target: Card, source: Card): Card {
  if (target.kind === "vocabulary") {
    const sourceVocab =
      source.kind === "vocabulary"
        ? source.content
        : vocabularyFromGrammarContent(source.content)
    return { ...target, content: mergeVocabularyContent(target.content, sourceVocab) }
  }
  const sourceGrammar =
    source.kind === "grammar"
      ? source.content
      : grammarFromVocabularyContent(source.content)
  return { ...target, content: mergeGrammarContent(target.content, sourceGrammar) }
}

/**
 * Merge `source` into `target`, saving the merged card and deleting `source`.
 * `source`'s images are always carried over into the merged card, so its
 * media blobs must not be deleted along with it.
 */
export async function mergeCards(target: Card, source: Card): Promise<Card> {
  const merged: Card = { ...mergeCardContent(target, source), updatedAt: Date.now() }
  await saveCard(merged)
  await deleteCard(source.id, { keepMedia: true })
  return merged
}

/** True if a card other than `excludeCardId` still references this media id (e.g. bulk import dedups identical images across notes that land on separate cards). */
export async function isMediaReferencedByOtherCards(
  mediaId: string,
  excludeCardId: string,
): Promise<boolean> {
  const cards = await db.cards.toArray()
  return cards.some(
    (card) => card.id !== excludeCardId && card.content.images.includes(mediaId),
  )
}

export async function deleteCard(
  cardId: string,
  options?: { keepMedia?: boolean },
): Promise<void> {
  const keepMedia = options?.keepMedia ?? false
  const card = await db.cards.get(cardId)
  const now = Date.now()
  if (card && !keepMedia) {
    for (const imgId of card.content.images) {
      await recordTombstone("media", imgId, now)
    }
  }
  const sched = await db.scheduling.where("cardId").equals(cardId).toArray()
  for (const row of sched) {
    await recordTombstone("scheduling", row.id, now)
  }
  await recordTombstone("card", cardId, now)

  await db.transaction("rw", db.cards, db.scheduling, db.media, async () => {
    if (card && !keepMedia) {
      for (const imgId of card.content.images) {
        await db.media.delete(imgId)
      }
    }
    await db.cards.delete(cardId)
    await db.scheduling.where("cardId").equals(cardId).delete()
  })

  // A deleted card can't be pushed by "Sync edits" any more — drop it so the
  // button doesn't keep counting it, or silently no-op a push for it later.
  removeSessionEditedCardIds([cardId])
}

export function defaultVocabulary(): VocabularyCardContent {
  return {
    wordJa: "",
    reading: "",
    readingParts: {},
    readings: {},
    definitionsEn: [""],
    images: [],
    exampleSentences: [],
    confusedWith: [],
  }
}

export function defaultGrammar(): GrammarCardContent {
  return {
    sentenceWithGap: "",
    gapMarker: "___",
    construction: "",
    constructionReading: "",
    constructionReadingParts: {},
    translationEn: "",
    readings: {},
    images: [],
    singleSided: false,
    confusedWith: [],
  }
}

/** {结论: けつろん, 至る: いたる} segments -> a readingParts-shaped map. */
function segmentsToReadingParts(
  segments: ReturnType<typeof constructionReadingSegments>,
): Record<string, string> {
  if (!segments) return {}
  return Object.fromEntries(segments.map((s) => [s.text, s.reading ?? ""]))
}

export function vocabularyFromGrammarContent(
  content: GrammarCardContent,
): VocabularyCardContent {
  const segments = constructionReadingSegments(content)
  // A reading only makes sense for a construction with kanji — matches
  // validateVocabulary's rule for the resulting card's `reading` field.
  const reading = containsKanji(content.construction)
    ? content.constructionReading
    : undefined
  return {
    wordJa: content.construction,
    reading,
    readingParts: segments
      ? segmentsToReadingParts(segments)
      : { ...(content.constructionReadingParts ?? {}) },
    readings: { ...content.readings },
    definitionsEn: [content.translationEn],
    images: [...content.images],
    exampleSentences: [content.sentenceWithGap],
    confusedWith: [...(content.confusedWith ?? [])],
  }
}

export function grammarFromVocabularyContent(
  content: VocabularyCardContent,
): GrammarCardContent {
  const gapMarker = "___"
  const exampleSentence = content.exampleSentences[0] ?? ""
  const sentenceWithGap =
    content.wordJa && exampleSentence.includes(content.wordJa)
      ? exampleSentence.replace(content.wordJa, gapMarker)
      : exampleSentence

  const segments = phraseReadingSegments(content)

  return {
    sentenceWithGap,
    gapMarker,
    construction: content.wordJa,
    constructionReading: content.reading,
    constructionReadingParts: segments
      ? segmentsToReadingParts(segments)
      : { ...(content.readingParts ?? {}) },
    translationEn: content.definitionsEn.filter((s) => s.trim()).join("; "),
    readings: { ...(content.readings ?? {}) },
    images: [...content.images],
    confusedWith: [...(content.confusedWith ?? [])],
  }
}

export async function createVocabularyCard(
  deckId: string,
  content: VocabularyCardContent,
): Promise<Card> {
  const err = validateVocabulary(content)
  if (err) throw new Error(err)
  const now = Date.now()
  const card: Card = {
    id: newId(),
    deckId,
    kind: "vocabulary",
    content,
    updatedAt: now,
  }
  await saveCard(card)
  return card
}

export async function createGrammarCard(
  deckId: string,
  content: GrammarCardContent,
): Promise<Card> {
  const normalized = normalizeGrammarContent(content)
  const err = validateGrammar(normalized)
  if (err) throw new Error(err)
  const now = Date.now()
  const card: Card = {
    id: newId(),
    deckId,
    kind: "grammar",
    content: normalized,
    updatedAt: now,
  }
  await saveCard(card)
  return card
}

export async function loadSchedulingRow(
  cardId: string,
  modeId: string,
): Promise<SchedulingRow | undefined> {
  return db.scheduling.get(schedulingId(cardId, modeId))
}

export async function updateSchedulingRow(row: SchedulingRow): Promise<void> {
  await db.scheduling.put(row)
}

/** Bring a suspended/leech card (see ankiSrs.ts) back into review by
 * resetting its pushed-out due date to now — mirrors Anki's own
 * "unsuspend" action, which likewise just clears the exclusion without
 * touching the card's study history. */
export async function unsuspendCard(cardId: string): Promise<void> {
  const now = Date.now()
  const rows = await db.scheduling.where("cardId").equals(cardId).toArray()
  for (const row of rows) {
    if (!isSuspendedDue(row.due, now)) continue
    await updateSchedulingRow({
      ...row,
      due: now,
      fsrs: { ...row.fsrs, due: now },
      updatedAt: now,
    })
  }
}

/** Flag a scheduling row as a leech (user chose "除外" on the leech prompt) —
 * keeps it in normal review rotation, just remembers to badge it going
 * forward. Unlike `unsuspendCard`, this doesn't touch `due`/`fsrs`. */
export async function markLeech(cardId: string, modeId: string): Promise<void> {
  const row = await loadSchedulingRow(cardId, modeId)
  if (!row) return
  await updateSchedulingRow({ ...row, isLeech: true, updatedAt: Date.now() })
  markCardEdited(cardId)
}

/** Deserialize FSRS card from scheduling row */
export function fsrsFromRow(row: SchedulingRow) {
  return deserializeFsrs(row.fsrs)
}

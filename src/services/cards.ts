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
} from "../domain/vocabularyContent"
import { containsKanji, reviewModesForCard } from "../domain/types"
import { db, type SchedulingRow } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import {
  deserializeFsrs,
  emptyFsrs,
  serializeFsrs,
} from "../lib/srs/schedule"
import { pushCardRemote, pushSchedulingRemote } from "./decks"
import type { User } from "firebase/auth"

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
    return "Add at least one pronunciation (reading), English meaning, or image"
  }
  return null
}

export function validateGrammar(content: GrammarCardContent): string | null {
  if (!content.sentenceWithGap.trim()) return "Sentence is required"
  if (!content.construction.trim()) return "Construction is required"
  const hasTranslation = content.translationEn.trim().length > 0
  const hasImage = content.images.length > 0
  if (!hasTranslation && !hasImage)
    return "Add at least one English translation or one image"
  const gap = content.gapMarker.trim() || "___"
  if (!content.sentenceWithGap.includes(gap))
    return `Sentence must contain the gap marker (${gap})`
  return null
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

export async function saveCard(card: Card, user: User | null): Promise<void> {
  await db.cards.put(card)
  await ensureSchedulingForCard(card)
  await pushCardRemote(user, card.id)
}

export async function deleteCard(cardId: string): Promise<void> {
  await db.transaction("rw", db.cards, db.scheduling, async () => {
    await db.cards.delete(cardId)
    await db.scheduling.where("cardId").equals(cardId).delete()
  })
}

export function defaultVocabulary(): VocabularyCardContent {
  return {
    wordJa: "",
    reading: "",
    definitionsEn: [""],
    images: [],
    exampleSentences: [],
    synonymsJa: [],
  }
}

export function defaultGrammar(): GrammarCardContent {
  return {
    sentenceWithGap: "",
    gapMarker: "___",
    construction: "",
    translationEn: "",
    readings: {},
    images: [],
    synonymsJa: [],
  }
}

export async function createVocabularyCard(
  deckId: string,
  content: VocabularyCardContent,
  user: User | null,
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
  await saveCard(card, user)
  return card
}

export async function createGrammarCard(
  deckId: string,
  content: GrammarCardContent,
  user: User | null,
): Promise<Card> {
  const err = validateGrammar(content)
  if (err) throw new Error(err)
  const now = Date.now()
  const card: Card = {
    id: newId(),
    deckId,
    kind: "grammar",
    content,
    updatedAt: now,
  }
  await saveCard(card, user)
  return card
}

export async function loadSchedulingRow(
  cardId: string,
  modeId: string,
): Promise<SchedulingRow | undefined> {
  return db.scheduling.get(schedulingId(cardId, modeId))
}

export async function updateSchedulingRow(
  row: SchedulingRow,
  user: User | null,
): Promise<void> {
  await db.scheduling.put(row)
  await pushSchedulingRemote(user, row.id)
}

/** Deserialize FSRS card from scheduling row */
export function fsrsFromRow(row: SchedulingRow) {
  return deserializeFsrs(row.fsrs)
}

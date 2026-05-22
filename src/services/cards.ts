import type {
  Card,
  GrammarCardContent,
  VocabularyCardContent,
} from "../domain/types"
import { containsKanji, reviewModesForCard } from "../domain/types"
import { db, type SchedulingRow } from "../lib/db/schema"
import { newId } from "../lib/db/id"
import {
  deserializeFsrs,
  emptyFsrs,
  serializeFsrs,
} from "../lib/srs/schedule"
import {
  pushAllSchedulingForCard,
  pushCardRemote,
  pushSchedulingRemote,
} from "./decks"
import { schedulePushAfterMutation } from "../lib/sync/schedulePush"
import { recordTombstone } from "../lib/sync/tombstones"
import {
  deleteCardRemote,
  deleteSchedulingRemote,
} from "../lib/sync/firestoreSync"
import { getFirestoreDb } from "../lib/firebase"
import type { User } from "firebase/auth"

export function validateVocabulary(content: VocabularyCardContent): string | null {
  if (!content.wordJa.trim()) return "Japanese word is required"
  const hasKanji = containsKanji(content.wordJa)
  if (hasKanji && !(content.reading?.trim())) return "Reading is required when the word contains kanji"
  const hasDef = content.definitionsEn.some((s) => s.trim().length > 0)
  const hasImg = content.images.length > 0
  if (!hasDef && !hasImg)
    return "Add at least one English definition or one image"
  return null
}

export function validateGrammar(content: GrammarCardContent): string | null {
  if (!content.sentenceWithGap.trim()) return "Sentence is required"
  if (!content.construction.trim()) return "Construction is required"
  if (!content.translationEn.trim()) return "English translation is required"
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
  await pushAllSchedulingForCard(user, card.id)
  schedulePushAfterMutation(user)
}

export async function deleteCard(
  cardId: string,
  user: User | null,
): Promise<void> {
  const card = await db.cards.get(cardId)
  const now = Date.now()
  if (card) {
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
    if (card) {
      for (const imgId of card.content.images) {
        await db.media.delete(imgId)
      }
    }
    await db.cards.delete(cardId)
    await db.scheduling.where("cardId").equals(cardId).delete()
  })

  const fs = getFirestoreDb()
  if (fs && user) {
    await deleteCardRemote(fs, user.uid, cardId)
    for (const row of sched) {
      await deleteSchedulingRemote(fs, user.uid, row.id)
    }
  }
  schedulePushAfterMutation(user)
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
  schedulePushAfterMutation(user)
}

/** Deserialize FSRS card from scheduling row */
export function fsrsFromRow(row: SchedulingRow) {
  return deserializeFsrs(row.fsrs)
}

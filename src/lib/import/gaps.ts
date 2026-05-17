import type { Card, GrammarCardContent, VocabularyCardContent } from "../../domain/types"
import { containsKanji } from "../../domain/types"
import { isKanaOnly } from "../../domain/vocabularyContent"
import { validateGrammar, validateVocabulary } from "../../services/cards"
import { saveImageBlob } from "../../services/media"
import type { BulkImportPayload } from "./types"

export type VocabularyGapDraft = {
  kind: "vocabulary"
  discarded?: boolean
  englishLines?: string
  reading?: string
  imageFiles?: File[]
}

export type GrammarGapDraft = {
  kind: "grammar"
  discarded?: boolean
  translationEn?: string
  imageFiles?: File[]
}

export type ImportGapDraft = VocabularyGapDraft | GrammarGapDraft

export type ImportGapItem = {
  cardId: string
  kind: "vocabulary" | "grammar"
  title: string
  detail: string
  /** Fields the user may supply (at least one required for vocab). */
  canFillReading: boolean
  canFillEnglish: boolean
  canFillImage: boolean
}

export function cardImportValidationError(card: Card): string | null {
  if (card.kind === "vocabulary") return validateVocabulary(card.content)
  return validateGrammar(card.content)
}

export function collectImportGaps(payload: BulkImportPayload): ImportGapItem[] {
  const gaps: ImportGapItem[] = []
  for (const card of payload.cards) {
    if (!cardImportValidationError(card)) continue
    gaps.push(gapItemFromCard(card))
  }
  return gaps
}

function gapItemFromCard(card: Card): ImportGapItem {
  if (card.kind === "vocabulary") {
    const c = card.content
    const kanaOnly = isKanaOnly(c.wordJa)
    return {
      cardId: card.id,
      kind: "vocabulary",
      title: c.wordJa,
      detail: kanaOnly
        ? "Add an English meaning or an image."
        : "Add a pronunciation (reading), English meaning, or an image.",
      canFillReading: !kanaOnly && containsKanji(c.wordJa),
      canFillEnglish: true,
      canFillImage: true,
    }
  }
  const c = card.content
  return {
    cardId: card.id,
    kind: "grammar",
    title: c.sentenceWithGap.slice(0, 60),
    detail: "Add an English translation or an image.",
    canFillReading: false,
    canFillEnglish: true,
    canFillImage: c.images.length === 0,
  }
}

function mergeVocabularyDraft(
  content: VocabularyCardContent,
  draft: VocabularyGapDraft,
  newImageIds: string[],
): VocabularyCardContent {
  const englishLines = draft.englishLines
    ?.split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
  const next: VocabularyCardContent = {
    ...content,
    reading: draft.reading?.trim() || content.reading,
    definitionsEn:
      englishLines && englishLines.length > 0
        ? englishLines
        : content.definitionsEn,
    images: [...content.images, ...newImageIds],
  }
  if (isKanaOnly(next.wordJa)) next.reading = undefined
  return next
}

function mergeGrammarDraft(
  content: GrammarCardContent,
  draft: GrammarGapDraft,
  newImageIds: string[],
): GrammarCardContent {
  const translationEn = draft.translationEn?.trim()
  return {
    ...content,
    translationEn: translationEn || content.translationEn,
    images: [...content.images, ...newImageIds],
  }
}

/** True when the card can be imported (completed or explicitly discarded). */
export function isImportGapResolved(
  card: Card,
  draft: ImportGapDraft | undefined,
): boolean {
  if (!draft) return false
  if (draft.discarded) return true
  return isImportGapDraftSatisfied(card, draft)
}

/** True when merging this draft would satisfy validation. */
export function isImportGapDraftSatisfied(
  card: Card,
  draft: ImportGapDraft | undefined,
): boolean {
  if (!draft || draft.discarded) return false
  const pendingImages =
    draft.kind === "vocabulary" || draft.kind === "grammar"
      ? draft.imageFiles?.length ?? 0
      : 0
  const probe = applyDraftToCard(
    card,
    draft,
    pendingImages > 0 ? ["__pending__"] : [],
  )
  return cardImportValidationError(probe) === null
}

function applyDraftToCard(
  card: Card,
  draft: ImportGapDraft,
  newImageIds: string[],
): Card {
  if (card.kind === "vocabulary" && draft.kind === "vocabulary") {
    return {
      ...card,
      content: mergeVocabularyDraft(card.content, draft, newImageIds),
    }
  }
  if (card.kind === "grammar" && draft.kind === "grammar") {
    return {
      ...card,
      content: mergeGrammarDraft(card.content, draft, newImageIds),
    }
  }
  return card
}

export async function applyImportDrafts(
  payload: BulkImportPayload,
  drafts: Record<string, ImportGapDraft>,
): Promise<BulkImportPayload> {
  const cards: Card[] = []
  for (const card of payload.cards) {
    const draft = drafts[card.id]
    if (draft?.discarded) continue
    if (!draft) {
      cards.push(card)
      continue
    }
    const newImageIds: string[] = []
    const imageFiles =
      draft.kind === "vocabulary" || draft.kind === "grammar"
        ? draft.imageFiles
        : undefined
    if (imageFiles?.length) {
      for (const file of imageFiles) {
        newImageIds.push(await saveImageBlob(file))
      }
    }
    const updated = applyDraftToCard(card, draft, newImageIds)
    const err = cardImportValidationError(updated)
    if (err) {
      const label =
        updated.kind === "vocabulary"
          ? updated.content.wordJa
          : updated.content.sentenceWithGap.slice(0, 40)
      throw new Error(`${label}: ${err}`)
    }
    cards.push(updated)
  }
  for (const card of cards) {
    const err = cardImportValidationError(card)
    if (err) {
      const label =
        card.kind === "vocabulary"
          ? card.content.wordJa
          : card.content.sentenceWithGap.slice(0, 40)
      throw new Error(`${label}: ${err}`)
    }
  }
  const keptIds = new Set(cards.map((c) => c.id))
  return {
    ...payload,
    cards,
    scheduling: payload.scheduling.filter((row) => keptIds.has(row.cardId)),
  }
}

export function countDiscardedGaps(
  gapCardIds: string[],
  drafts: Record<string, ImportGapDraft>,
): number {
  return gapCardIds.filter((id) => drafts[id]?.discarded).length
}

export function payloadImportReady(payload: BulkImportPayload): boolean {
  return collectImportGaps(payload).length === 0
}

import type { Card, Deck, ReviewModeId } from "../../domain/types"
import type { SchedulingRow } from "../db/schema"

export type ExtractedAnkiCard = {
  id: number
  ord: number
  type: number
  queue: number
  due: number
  ivl: number
  factor: number
  reps: number
  lapses: number
}

export type ExtractedAnkiNote = {
  id: number
  noteType: string
  fields: string[]
  tags: string
  cards: ExtractedAnkiCard[]
}

export type ExtractedPackage = {
  deckId: number
  deckName: string
  collectionCrt: number
  notes: ExtractedAnkiNote[]
  /** Anki media filename → path relative to extract directory */
  mediaPaths: Record<string, string>
}

export type BulkMediaItem = {
  id: string
  mimeType: string
  /** Prefer `bytes` when importing in-browser; `base64` for API payloads. */
  bytes?: Uint8Array
  base64?: string
}

export type BulkImportPayload = {
  deck: Deck
  cards: Card[]
  scheduling: SchedulingRow[]
  media: BulkMediaItem[]
}

export type AnkiSchedulingSource = ExtractedAnkiCard & {
  /** Note carries Anki's "leech" tag — Anki itself stops surfacing these for review. */
  isLeech: boolean
}

export type ModeSchedulingMap = Partial<Record<ReviewModeId, AnkiSchedulingSource>>

/** User's choice for a note that looks like grammar (has a gap marker). */
export type GrammarDecision = "grammar" | "vocab"

/** Grammar group key (gapped-sentence key) → the user's grammar/vocab choice. */
export type GrammarDecisionMap = Record<string, GrammarDecision>

/** A gap-marked note group surfaced to the user to confirm grammar vs vocab. */
export type GrammarCandidate = {
  /** Stable group key; also the key used in GrammarDecisionMap. */
  key: string
  /** Normalized gapped sentence, for display. */
  sentence: string
  /** Construction / answer, for display. */
  construction: string
  /** How many distinct images the group references. */
  imageCount: number
}

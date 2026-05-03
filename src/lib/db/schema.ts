import Dexie, { type EntityTable } from "dexie"
import type { Card, Deck, ReviewModeId } from "../../domain/types"
import type { Card as FsrsCard } from "ts-fsrs"

export type SchedulingRow = {
  id: string
  cardId: string
  modeId: ReviewModeId
  /** Serialized FSRS card (dates as epoch ms in JSON) */
  fsrs: SerializedFsrsCard
  due: number
  updatedAt: number
}

export type SerializedFsrsCard = Omit<
  FsrsCard,
  "due" | "last_review"
> & {
  due: number
  last_review?: number
}

export type ReviewEventRow = {
  id: string
  ts: number
  cardId: string
  deckId: string
  modeId: ReviewModeId
  responseMs: number | null
  outcome: "correct" | "incorrect"
  grade: number
  undone: boolean
}

export type ReviewUndoRow = {
  id: string
  ts: number
  /** Snapshot of scheduling rows before judgement (JSON) */
  schedulingSnapshot: string
}

export type MediaRow = {
  id: string
  blob: Blob
  mimeType: string
}

export type SyncOutboxRow = {
  id: string
  collection: string
  docId: string
  payload: string
  updatedAt: number
}

export class BenkyouDB extends Dexie {
  decks!: EntityTable<Deck, "id">
  cards!: EntityTable<Card, "id">
  scheduling!: EntityTable<SchedulingRow, "id">
  reviewEvents!: EntityTable<ReviewEventRow, "id">
  reviewUndo!: EntityTable<ReviewUndoRow, "id">
  media!: EntityTable<MediaRow, "id">
  syncOutbox!: EntityTable<SyncOutboxRow, "id">

  constructor() {
    super("benkyou")
    this.version(1).stores({
      decks: "id, name, updatedAt",
      cards: "id, deckId, kind, updatedAt",
      scheduling: "id, cardId, modeId, due, updatedAt",
      reviewEvents: "id, ts, cardId, modeId",
      reviewUndo: "id, ts",
      media: "id",
      syncOutbox: "id, collection, updatedAt",
    })
  }
}

export const db = new BenkyouDB()

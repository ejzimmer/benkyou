import Dexie, { type EntityTable } from "dexie"
import type { Card, Deck, ReviewModeId } from "../../domain/types"
import type { Card as FsrsCard } from "ts-fsrs"
import type { Tombstone } from "../sync/syncTypes"

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
  /** Prompt shown → “Show answer” (ms); used for FSRS grade heuristic */
  responseMs: number | null
  outcome: "correct" | "incorrect"
  grade: number
  undone: boolean
}

export type ReviewUndoRow = {
  id: string
  ts: number
  /** Snapshot of scheduling row before judgement (JSON) */
  schedulingSnapshot: string
  /** Present on rows created after schema fix — undo deletes this event exactly */
  linkedEventId?: string
  cardId?: string
  modeId?: ReviewModeId
}

export type MediaRow = {
  id: string
  blob: Blob
  mimeType: string
  updatedAt: number
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
  tombstones!: EntityTable<Tombstone, "id">
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
    this.version(2).stores({
      decks: "id, name, updatedAt",
      cards: "id, deckId, kind, updatedAt",
      scheduling: "id, cardId, modeId, due, updatedAt",
      reviewEvents: "id, ts, cardId, modeId",
      reviewUndo: "id, ts, cardId, modeId",
      media: "id",
      syncOutbox: "id, collection, updatedAt",
    })
    this.version(3).stores({
      decks: "id, name, updatedAt",
      cards: "id, deckId, kind, updatedAt",
      scheduling: "id, cardId, modeId, due, updatedAt",
      reviewEvents: "id, ts, cardId, modeId",
      reviewUndo: "id, ts, cardId, modeId",
      media: "id, updatedAt",
      tombstones: "id, entityType, entityId, deletedAt",
      syncOutbox: "id, collection, updatedAt",
    })
    this.version(3).upgrade((tx) =>
      tx
        .table("media")
        .toCollection()
        .modify((row: MediaRow) => {
          if (row.updatedAt == null) row.updatedAt = Date.now()
        }),
    )
  }
}

export const db = new BenkyouDB()

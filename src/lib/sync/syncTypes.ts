import type { Card, Deck } from "../../domain/types"
import type { MediaRow, SchedulingRow } from "../db/schema"

export type SyncEntityType = "deck" | "card" | "scheduling" | "media"

export type SyncConflictChoice = "local" | "remote"

export type SyncConflictBase = {
  key: string
  entityType: SyncEntityType
  entityId: string
  localUpdatedAt: number
  remoteUpdatedAt: number
  localSummary: string
  remoteSummary: string
}

export type DeckSyncConflict = SyncConflictBase & {
  entityType: "deck"
  local: Deck
  remote: Deck
}

export type CardSyncConflict = SyncConflictBase & {
  entityType: "card"
  local: Card
  remote: Card
}

export type SchedulingSyncConflict = SyncConflictBase & {
  entityType: "scheduling"
  local: SchedulingRow
  remote: SchedulingRow
}

export type MediaSyncConflict = SyncConflictBase & {
  entityType: "media"
  local: MediaRow
  remote: MediaRow
  localPreviewUrl: string
  remotePreviewUrl: string
}

export type SyncConflict =
  | DeckSyncConflict
  | CardSyncConflict
  | SchedulingSyncConflict
  | MediaSyncConflict

export type Tombstone = {
  id: string
  entityType: SyncEntityType
  entityId: string
  deletedAt: number
  /** Set after Storage object delete succeeded or was already absent. */
  storagePurgedAt?: number
}

export type RemoteMediaMeta = {
  id: string
  mimeType: string
  updatedAt: number
}

export const LAST_SYNCED_AT_KEY = "benkyou:lastSyncedAt"

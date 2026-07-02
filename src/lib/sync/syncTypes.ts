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
  /** Human-readable label identifying what the conflicting row belongs to,
   *  e.g. the card a scheduling conflict's review schedule is for. */
  contextLabel?: string
  /** Human-readable description of what differs between local and remote. */
  differences?: string[]
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
  /** SHA-256 hex digest of the blob's bytes; absent on entries written before
   *  hash tracking was added — sync backfills it the next time it has to
   *  download that item anyway. */
  digest?: string
}

export const LAST_SYNCED_AT_KEY = "benkyou:lastSyncedAt"

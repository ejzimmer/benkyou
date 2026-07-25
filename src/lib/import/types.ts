import type { Card, Deck } from "../../domain/types"
import type { SchedulingRow } from "../db/schema"

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

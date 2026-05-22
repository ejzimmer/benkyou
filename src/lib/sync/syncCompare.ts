import type { Card, Deck } from "../../domain/types"
import type { MediaRow, SchedulingRow } from "../db/schema"
import type { RemoteMediaMeta, SyncConflictChoice, Tombstone } from "./syncTypes"

export function tombstoneId(
  entityType: Tombstone["entityType"],
  entityId: string,
): string {
  return `${entityType}:${entityId}`
}

export function stableDeckPayload(deck: Deck): string {
  return JSON.stringify({ name: deck.name })
}

export function stableCardPayload(card: Card): string {
  return JSON.stringify({
    deckId: card.deckId,
    kind: card.kind,
    content: card.content,
    meta: card.meta ?? null,
  })
}

export function stableSchedulingPayload(row: SchedulingRow): string {
  return JSON.stringify({
    cardId: row.cardId,
    modeId: row.modeId,
    fsrs: row.fsrs,
    due: row.due,
  })
}

export function deckChanged(local: Deck, remote: Deck): boolean {
  return stableDeckPayload(local) !== stableDeckPayload(remote)
}

export function cardChanged(local: Card, remote: Card): boolean {
  return stableCardPayload(local) !== stableCardPayload(remote)
}

export function schedulingChanged(
  local: SchedulingRow,
  remote: SchedulingRow,
): boolean {
  return stableSchedulingPayload(local) !== stableSchedulingPayload(remote)
}

export function resolveByTimestamp<T extends { updatedAt: number }>(
  local: T,
  remote: T,
  lastSyncedAt: number | null,
  changed: boolean,
): SyncConflictChoice | "conflict" {
  if (!changed) return "local"
  if (lastSyncedAt == null) {
    return remote.updatedAt >= local.updatedAt ? "remote" : "local"
  }
  const localChanged = local.updatedAt > lastSyncedAt
  const remoteChanged = remote.updatedAt > lastSyncedAt
  if (localChanged && remoteChanged) return "conflict"
  if (remoteChanged) return "remote"
  if (localChanged) return "local"
  return remote.updatedAt >= local.updatedAt ? "remote" : "local"
}

export function deckSummary(deck: Deck): string {
  return `Deck “${deck.name}”`
}

export function cardSummary(card: Card): string {
  if (card.kind === "vocabulary") {
    const w = card.content.wordJa || "(empty)"
    const defs = card.content.definitionsEn.filter(Boolean).join("; ")
    return defs ? `${w} — ${defs}` : w
  }
  return card.content.construction || card.content.sentenceWithGap
}

export function schedulingSummary(row: SchedulingRow): string {
  const due = new Date(row.due).toLocaleString()
  return `Review mode ${row.modeId} · due ${due}`
}

export function mediaSummary(meta: { mimeType: string; updatedAt: number }): string {
  return `${meta.mimeType} · ${new Date(meta.updatedAt).toLocaleString()}`
}

export async function mediaBlobDigest(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function mediaChanged(
  local: MediaRow,
  remote: RemoteMediaMeta,
  localDigest: string,
  remoteDigest: string,
): boolean {
  return localDigest !== remoteDigest || local.mimeType !== remote.mimeType
}

import type { Card, Deck } from "../../domain/types"
import type { MediaRow, SchedulingRow } from "../db/schema"
import { stableCompareJson } from "./firestoreData"
import type { RemoteMediaMeta, SyncConflictChoice, Tombstone } from "./syncTypes"

export function tombstoneId(
  entityType: Tombstone["entityType"],
  entityId: string,
): string {
  return `${entityType}:${entityId}`
}

function deckPayload(deck: Deck) {
  return { name: deck.name }
}

function cardPayload(card: Card) {
  return {
    deckId: card.deckId,
    kind: card.kind,
    content: card.content,
    meta: card.meta ?? null,
  }
}

function schedulingPayload(row: SchedulingRow) {
  return {
    cardId: row.cardId,
    modeId: row.modeId,
    fsrs: row.fsrs,
    due: row.due,
  }
}

export function deckChanged(local: Deck, remote: Deck): boolean {
  return !stableCompareJson(deckPayload(local), deckPayload(remote))
}

export function cardChanged(local: Card, remote: Card): boolean {
  return !stableCompareJson(cardPayload(local), cardPayload(remote))
}

export function schedulingChanged(
  local: SchedulingRow,
  remote: SchedulingRow,
): boolean {
  return !stableCompareJson(schedulingPayload(local), schedulingPayload(remote))
}

export function resolveByTimestamp<T extends { updatedAt: number }>(
  local: T,
  remote: T,
  lastSyncedAt: number | null,
  changed: boolean,
): SyncConflictChoice | "conflict" {
  if (!changed) {
    return remote.updatedAt >= local.updatedAt ? "remote" : "local"
  }
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

/** Pick a side without prompting when payloads match (only timestamps / metadata differ). */
export function resolveEntityMerge<T extends { updatedAt: number }>(
  local: T,
  remote: T,
  lastSyncedAt: number | null,
  payloadEqual: boolean,
): SyncConflictChoice | "conflict" {
  if (payloadEqual) {
    return remote.updatedAt >= local.updatedAt ? "remote" : "local"
  }
  return resolveByTimestamp(local, remote, lastSyncedAt, true)
}

export function summariesLookIdentical(
  localSummary: string,
  remoteSummary: string,
): boolean {
  return localSummary.trim() === remoteSummary.trim()
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

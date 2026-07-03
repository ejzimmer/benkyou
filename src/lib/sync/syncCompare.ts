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

const FSRS_STATE_LABELS: Record<number, string> = {
  0: "New",
  1: "Learning",
  2: "Review",
  3: "Relearning",
}

function fsrsStateLabel(state: number): string {
  return FSRS_STATE_LABELS[state] ?? `State ${state}`
}

function fsrsDateLabel(epochMs: number | undefined): string {
  return epochMs == null ? "never" : new Date(epochMs).toLocaleString()
}

/** Two decimal places is enough precision to describe FSRS drift to a user. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Human-readable list of what differs between two scheduling rows, for
 *  showing the user what a review-schedule conflict actually consists of. */
export function schedulingDiffDetails(
  local: SchedulingRow,
  remote: SchedulingRow,
): string[] {
  const diffs: string[] = []
  if (local.due !== remote.due) {
    diffs.push(
      `Due date — this device: ${new Date(local.due).toLocaleString()}, cloud: ${new Date(remote.due).toLocaleString()}`,
    )
  }
  if (local.fsrs.state !== remote.fsrs.state) {
    diffs.push(
      `Review stage — this device: ${fsrsStateLabel(local.fsrs.state)}, cloud: ${fsrsStateLabel(remote.fsrs.state)}`,
    )
  }
  if (local.fsrs.reps !== remote.fsrs.reps) {
    diffs.push(
      `Reviews completed — this device: ${local.fsrs.reps}, cloud: ${remote.fsrs.reps}`,
    )
  }
  if (local.fsrs.lapses !== remote.fsrs.lapses) {
    diffs.push(
      `Lapses — this device: ${local.fsrs.lapses}, cloud: ${remote.fsrs.lapses}`,
    )
  }
  if (round2(local.fsrs.stability) !== round2(remote.fsrs.stability)) {
    diffs.push(
      `Stability — this device: ${local.fsrs.stability.toFixed(2)}, cloud: ${remote.fsrs.stability.toFixed(2)}`,
    )
  }
  if (round2(local.fsrs.difficulty) !== round2(remote.fsrs.difficulty)) {
    diffs.push(
      `Difficulty — this device: ${local.fsrs.difficulty.toFixed(2)}, cloud: ${remote.fsrs.difficulty.toFixed(2)}`,
    )
  }
  if (local.fsrs.last_review !== remote.fsrs.last_review) {
    diffs.push(
      `Last reviewed — this device: ${fsrsDateLabel(local.fsrs.last_review)}, cloud: ${fsrsDateLabel(remote.fsrs.last_review)}`,
    )
  }
  if (local.fsrs.learning_steps !== remote.fsrs.learning_steps) {
    diffs.push(
      `Learning steps — this device: ${local.fsrs.learning_steps}, cloud: ${remote.fsrs.learning_steps}`,
    )
  }
  if (round2(local.fsrs.elapsed_days) !== round2(remote.fsrs.elapsed_days)) {
    diffs.push(
      `Elapsed days — this device: ${local.fsrs.elapsed_days}, cloud: ${remote.fsrs.elapsed_days}`,
    )
  }
  if (round2(local.fsrs.scheduled_days) !== round2(remote.fsrs.scheduled_days)) {
    diffs.push(
      `Scheduled days — this device: ${local.fsrs.scheduled_days}, cloud: ${remote.fsrs.scheduled_days}`,
    )
  }
  return diffs
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

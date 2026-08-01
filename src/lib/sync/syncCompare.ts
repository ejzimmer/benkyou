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

/** FSRS card states, in the order a card progresses through them. */
export const FSRS_STATE_ORDER = ["New", "Learning", "Review", "Relearning"]

export function fsrsStateLabel(state: number): string {
  return FSRS_STATE_ORDER[state] ?? `State ${state}`
}

/** Two decimal places is enough precision to describe FSRS drift to a user. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type SchedulingDiffKind = "date" | "stage" | "integer" | "decimal"

export type SchedulingDiffRow = {
  label: string
  kind: SchedulingDiffKind
  local: number | undefined
  remote: number | undefined
}

/** Per-field breakdown of what differs between two scheduling rows, for the
 *  conflict modal's table — only fields that actually differ, so the table
 *  doesn't repeat values both sides already agree on. */
export function schedulingDiffRows(
  local: SchedulingRow,
  remote: SchedulingRow,
): SchedulingDiffRow[] {
  const rows: SchedulingDiffRow[] = []
  if (local.due !== remote.due) {
    rows.push({ label: "Due date", kind: "date", local: local.due, remote: remote.due })
  }
  if (local.fsrs.state !== remote.fsrs.state) {
    rows.push({
      label: "Review stage",
      kind: "stage",
      local: local.fsrs.state,
      remote: remote.fsrs.state,
    })
  }
  if (local.fsrs.reps !== remote.fsrs.reps) {
    rows.push({
      label: "Reviews completed",
      kind: "integer",
      local: local.fsrs.reps,
      remote: remote.fsrs.reps,
    })
  }
  if (local.fsrs.lapses !== remote.fsrs.lapses) {
    rows.push({
      label: "Lapses",
      kind: "integer",
      local: local.fsrs.lapses,
      remote: remote.fsrs.lapses,
    })
  }
  if (round2(local.fsrs.stability) !== round2(remote.fsrs.stability)) {
    rows.push({
      label: "Stability",
      kind: "decimal",
      local: local.fsrs.stability,
      remote: remote.fsrs.stability,
    })
  }
  if (round2(local.fsrs.difficulty) !== round2(remote.fsrs.difficulty)) {
    rows.push({
      label: "Difficulty",
      kind: "decimal",
      local: local.fsrs.difficulty,
      remote: remote.fsrs.difficulty,
    })
  }
  if (local.fsrs.last_review !== remote.fsrs.last_review) {
    rows.push({
      label: "Last reviewed",
      kind: "date",
      local: local.fsrs.last_review,
      remote: remote.fsrs.last_review,
    })
  }
  if (local.fsrs.learning_steps !== remote.fsrs.learning_steps) {
    rows.push({
      label: "Learning steps",
      kind: "integer",
      local: local.fsrs.learning_steps,
      remote: remote.fsrs.learning_steps,
    })
  }
  if (round2(local.fsrs.elapsed_days) !== round2(remote.fsrs.elapsed_days)) {
    rows.push({
      label: "Elapsed days",
      kind: "decimal",
      local: local.fsrs.elapsed_days,
      remote: remote.fsrs.elapsed_days,
    })
  }
  if (round2(local.fsrs.scheduled_days) !== round2(remote.fsrs.scheduled_days)) {
    rows.push({
      label: "Scheduled days",
      kind: "decimal",
      local: local.fsrs.scheduled_days,
      remote: remote.fsrs.scheduled_days,
    })
  }
  return rows
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

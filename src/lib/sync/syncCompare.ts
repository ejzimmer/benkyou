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

export type DiffKind = "text" | "date" | "stage" | "integer" | "decimal"

export type DiffRow = {
  label: string
  kind: DiffKind
  local: string | number | undefined
  remote: string | number | undefined
}

/** Per-field breakdown of what differs between two scheduling rows, for the
 *  conflict modal's table — only fields that actually differ, so the table
 *  doesn't repeat values both sides already agree on. */
export function schedulingDiffRows(
  local: SchedulingRow,
  remote: SchedulingRow,
): DiffRow[] {
  const rows: DiffRow[] = []
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

function arraysEqual(a: string[] = [], b: string[] = []): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function mapsEqual(
  a: Record<string, string> = {},
  b: Record<string, string> = {},
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  return aKeys.length === bKeys.length && aKeys.every((k) => a[k] === b[k])
}

function formatList(items: string[] = []): string {
  const list = items.filter((s) => s.trim())
  return list.length ? list.join("; ") : "—"
}

function formatMap(map: Record<string, string> = {}): string {
  const entries = Object.entries(map)
  return entries.length ? entries.map(([k, v]) => `${k}=${v}`).join(", ") : "—"
}

/** Per-field breakdown of what differs between two cards, for the conflict
 *  modal's table — only fields that actually differ, so the table doesn't
 *  repeat values both sides already agree on. Falls back to the coarse
 *  summary in the (very rare) case a card's `kind` itself differs between
 *  local and remote, since there's no shared field set to diff in that case. */
export function cardDiffRows(local: Card, remote: Card): DiffRow[] {
  const rows: DiffRow[] = []

  if (local.kind === "vocabulary" && remote.kind === "vocabulary") {
    const l = local.content
    const r = remote.content
    if (l.wordJa !== r.wordJa) {
      rows.push({ label: "Word", kind: "text", local: l.wordJa, remote: r.wordJa })
    }
    if ((l.reading ?? "") !== (r.reading ?? "")) {
      rows.push({
        label: "Reading",
        kind: "text",
        local: l.reading || "—",
        remote: r.reading || "—",
      })
    }
    if (!mapsEqual(l.readingParts, r.readingParts)) {
      rows.push({
        label: "Reading parts",
        kind: "text",
        local: formatMap(l.readingParts),
        remote: formatMap(r.readingParts),
      })
    }
    if (!mapsEqual(l.readings, r.readings)) {
      rows.push({
        label: "Furigana",
        kind: "text",
        local: formatMap(l.readings),
        remote: formatMap(r.readings),
      })
    }
    if (!arraysEqual(l.definitionsEn, r.definitionsEn)) {
      rows.push({
        label: "Meaning",
        kind: "text",
        local: formatList(l.definitionsEn),
        remote: formatList(r.definitionsEn),
      })
    }
    if (!arraysEqual(l.exampleSentences, r.exampleSentences)) {
      rows.push({
        label: "Example sentences",
        kind: "text",
        local: formatList(l.exampleSentences),
        remote: formatList(r.exampleSentences),
      })
    }
    if (!arraysEqual(l.images, r.images)) {
      rows.push({
        label: "Images",
        kind: "text",
        local: `${l.images.length}枚`,
        remote: `${r.images.length}枚`,
      })
    }
    if (!arraysEqual(l.confusedWith, r.confusedWith)) {
      rows.push({
        label: "Confused with",
        kind: "text",
        local: formatList(l.confusedWith),
        remote: formatList(r.confusedWith),
      })
    }
  } else if (local.kind === "grammar" && remote.kind === "grammar") {
    const l = local.content
    const r = remote.content
    if (l.sentenceWithGap !== r.sentenceWithGap) {
      rows.push({
        label: "Sentence",
        kind: "text",
        local: l.sentenceWithGap,
        remote: r.sentenceWithGap,
      })
    }
    if (l.construction !== r.construction) {
      rows.push({
        label: "Construction",
        kind: "text",
        local: l.construction,
        remote: r.construction,
      })
    }
    if ((l.constructionReading ?? "") !== (r.constructionReading ?? "")) {
      rows.push({
        label: "Reading",
        kind: "text",
        local: l.constructionReading || "—",
        remote: r.constructionReading || "—",
      })
    }
    if (!mapsEqual(l.constructionReadingParts, r.constructionReadingParts)) {
      rows.push({
        label: "Reading parts",
        kind: "text",
        local: formatMap(l.constructionReadingParts),
        remote: formatMap(r.constructionReadingParts),
      })
    }
    if (l.translationEn !== r.translationEn) {
      rows.push({
        label: "Meaning",
        kind: "text",
        local: l.translationEn || "—",
        remote: r.translationEn || "—",
      })
    }
    if (!mapsEqual(l.readings, r.readings)) {
      rows.push({
        label: "Furigana",
        kind: "text",
        local: formatMap(l.readings),
        remote: formatMap(r.readings),
      })
    }
    if (!arraysEqual(l.images, r.images)) {
      rows.push({
        label: "Images",
        kind: "text",
        local: `${l.images.length}枚`,
        remote: `${r.images.length}枚`,
      })
    }
    if (Boolean(l.singleSided) !== Boolean(r.singleSided)) {
      rows.push({
        label: "Sides",
        kind: "text",
        local: l.singleSided ? "One-sided" : "Both sides",
        remote: r.singleSided ? "One-sided" : "Both sides",
      })
    }
    if (!arraysEqual(l.confusedWith, r.confusedWith)) {
      rows.push({
        label: "Confused with",
        kind: "text",
        local: formatList(l.confusedWith),
        remote: formatList(r.confusedWith),
      })
    }
  } else {
    rows.push({ label: "Content", kind: "text", local: cardSummary(local), remote: cardSummary(remote) })
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

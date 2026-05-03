import type { Card, ReviewModeId } from "../domain/types"
import { reviewModesForCard } from "../domain/types"
import {
  db,
  type ReviewEventRow,
  type ReviewUndoRow,
  type SchedulingRow,
} from "../lib/db/schema"
import { newId } from "../lib/db/id"
import {
  applyGrade,
  deserializeFsrs,
  serializeFsrs,
} from "../lib/srs/schedule"
import { responseTimeToGrade } from "../lib/srs/time-to-rating"
import type { Grade } from "ts-fsrs"
import { loadSchedulingRow, updateSchedulingRow } from "./cards"
import type { User } from "firebase/auth"

export type DueItem = {
  card: Card
  modeId: ReviewModeId
  due: number
}

export async function getDueQueue(now = Date.now()): Promise<DueItem[]> {
  const rows = await db.scheduling.filter((r) => r.due <= now).toArray()
  const cards = await db.cards.toArray()
  const byId = new Map(cards.map((c) => [c.id, c]))
  const list: DueItem[] = []
  for (const r of rows) {
    const card = byId.get(r.cardId)
    if (!card) continue
    const allowed = new Set(reviewModesForCard(card))
    if (!allowed.has(r.modeId)) continue
    list.push({ card, modeId: r.modeId, due: r.due })
  }
  list.sort((a, b) => a.due - b.due)
  return list
}

export async function prefetchDueForSession(now = Date.now()): Promise<DueItem[]> {
  return getDueQueue(now)
}

export type JudgementSnapshot = {
  schedulingRow: SchedulingRow
}

export async function prepareJudgement(
  cardId: string,
  modeId: ReviewModeId,
): Promise<JudgementSnapshot | null> {
  const row = await loadSchedulingRow(cardId, modeId)
  if (!row) return null
  return { schedulingRow: structuredClone(row) }
}

export async function commitJudgement(
  cardId: string,
  modeId: ReviewModeId,
  responseMs: number | null,
  selfCorrect: boolean,
  snapshot: JudgementSnapshot | null,
  user: User | null,
): Promise<void> {
  const row = await loadSchedulingRow(cardId, modeId)
  if (!row) return

  const grade = responseTimeToGrade(responseMs, selfCorrect) as Grade
  const now = new Date()
  const prevCard = deserializeFsrs(row.fsrs)
  const nextCard = applyGrade(prevCard, now, grade)

  const updated: SchedulingRow = {
    ...row,
    fsrs: serializeFsrs(nextCard),
    due: nextCard.due.getTime(),
    updatedAt: Date.now(),
  }
  await updateSchedulingRow(updated, user)

  const card = await db.cards.get(cardId)
  const event: ReviewEventRow = {
    id: newId(),
    ts: Date.now(),
    cardId,
    deckId: card?.deckId ?? "",
    modeId,
    responseMs,
    outcome: selfCorrect ? "correct" : "incorrect",
    grade,
    undone: false,
  }
  await db.reviewEvents.put(event)

  if (snapshot) {
    const undo: ReviewUndoRow = {
      id: newId(),
      ts: Date.now(),
      schedulingSnapshot: JSON.stringify(snapshot.schedulingRow),
    }
    await db.reviewUndo.put(undo)
  }
}

export async function undoLastJudgement(user: User | null): Promise<boolean> {
  const last = await db.reviewUndo.orderBy("ts").last()
  if (!last) return false
  let restored: SchedulingRow
  try {
    restored = JSON.parse(last.schedulingSnapshot) as SchedulingRow
  } catch {
    return false
  }
  await db.reviewUndo.delete(last.id)
  await updateSchedulingRow(restored, user)

  const ev = await db.reviewEvents.orderBy("ts").last()
  if (ev) await db.reviewEvents.delete(ev.id)

  return true
}

export async function restoreSchedulingSnapshot(
  snapshot: JudgementSnapshot,
  user: User | null,
): Promise<void> {
  await updateSchedulingRow(snapshot.schedulingRow, user)
}

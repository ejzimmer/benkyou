import { createEmptyCard, State, type Card as FsrsCard } from "ts-fsrs"
import { serializeFsrs } from "../srs/schedule"
import type { SerializedFsrsCard } from "../db/schema"
import type { AnkiSchedulingSource } from "./types"

const DAY_MS = 86_400_000

function ankiState(queue: number, type: number): State {
  if (queue === 0 || type === 0) return State.New
  if (queue === 1 || queue === 3 || type === 1) return State.Learning
  if (type === 3) return State.Relearning
  return State.Review
}

function ankiDueDate(
  source: AnkiSchedulingSource,
  collectionCrt: number,
): Date {
  if (source.queue === 2 || source.queue === 3) {
    const dayIndex = source.due
    const base = collectionCrt > 0 ? collectionCrt * 1000 : Date.now()
    return new Date(base + Math.max(0, dayIndex) * DAY_MS)
  }
  if (source.due > 1_000_000_000) {
    return new Date(source.due * 1000)
  }
  return new Date()
}

export function ankiSchedulingToFsrs(
  source: AnkiSchedulingSource,
  collectionCrt: number,
): SerializedFsrsCard {
  const empty = createEmptyCard()
  const due = ankiDueDate(source, collectionCrt)
  const scheduledDays = Math.max(0, source.ivl)
  const stability = Math.max(0.1, scheduledDays || empty.stability)
  const difficulty = Math.min(
    10,
    Math.max(1, empty.difficulty + (2500 - source.factor) / 1000),
  )
  const card: FsrsCard = {
    ...empty,
    due,
    stability,
    difficulty,
    scheduled_days: scheduledDays,
    reps: source.reps,
    lapses: source.lapses,
    state: ankiState(source.queue, source.type),
    last_review:
      source.reps > 0
        ? new Date(due.getTime() - scheduledDays * DAY_MS)
        : undefined,
  }
  return serializeFsrs(card)
}

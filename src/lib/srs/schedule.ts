import {
  createEmptyCard,
  fsrs,
  Rating,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs"
import type { SerializedFsrsCard } from "../db/schema"

const scheduler = fsrs()

export function emptyFsrs(): FsrsCard {
  return createEmptyCard()
}

export function serializeFsrs(card: FsrsCard): SerializedFsrsCard {
  return {
    ...card,
    due: card.due.getTime(),
    last_review: card.last_review?.getTime(),
  }
}

export function deserializeFsrs(s: SerializedFsrsCard): FsrsCard {
  return {
    ...s,
    due: new Date(s.due),
    last_review: s.last_review != null ? new Date(s.last_review) : undefined,
  }
}

export function applyGrade(
  card: FsrsCard,
  now: Date,
  grade: Grade,
): FsrsCard {
  const { card: next } = scheduler.next(card, now, grade)
  return next
}

const DAY_MS = 86_400_000

/** Anki import pushes suspended/leech cards' due date ~100 years out (see
 * ankiSrs.ts) so they never surface as due, mirroring Anki's own behaviour.
 * No real FSRS schedule reaches this far out from normal reviewing, so
 * treat it as that placeholder rather than a real due date. */
export function isSuspendedDue(due: number, now = Date.now()): boolean {
  return due - now > 10 * 365 * DAY_MS
}

export { Rating, fsrs, scheduler }

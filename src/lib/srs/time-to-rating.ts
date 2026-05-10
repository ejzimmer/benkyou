import { Rating, type Grade } from "ts-fsrs"

/**
 * Heuristic: faster response → easier (Good/Easy), slower → Harder.
 * Phase B: replace with calibrated curve from stored review events.
 */
export function responseTimeToGrade(
  responseMs: number | null,
  selfCorrect: boolean,
): Grade {
  if (!selfCorrect) return Rating.Again
  if (responseMs == null || responseMs <= 0) return Rating.Good

  const s = responseMs / 1000
  if (s < 2) return Rating.Easy
  if (s < 8) return Rating.Good
  if (s < 20) return Rating.Hard
  return Rating.Again
}

import { REVIEW_MODES, type ReviewModeId } from "../../domain/types"
import type { TimingSampleRow } from "../../lib/db/schema"

export type ModeTimingStats = {
  modeId: ReviewModeId
  count: number
  correctCount: number
  correctRate: number | null
  medianCorrectMs: number | null
  meanCorrectMs: number | null
}

/** Per-mode breakdown of recorded prompt→reveal timings, in `REVIEW_MODES`
 * order. Median/mean are computed over correct-answer samples only, since
 * those are what the reveal-threshold calibration (time-to-rating.ts) cares
 * about — an incorrect answer is always graded Again regardless of timing. */
export function computeTimingStats(samples: TimingSampleRow[]): ModeTimingStats[] {
  return REVIEW_MODES.map((modeId) => {
    const modeSamples = samples.filter((s) => s.modeId === modeId)
    const correctMs = modeSamples
      .filter((s) => s.correct)
      .map((s) => s.responseMs)
      .sort((a, b) => a - b)

    return {
      modeId,
      count: modeSamples.length,
      correctCount: correctMs.length,
      correctRate: modeSamples.length > 0 ? correctMs.length / modeSamples.length : null,
      medianCorrectMs: median(correctMs),
      meanCorrectMs: mean(correctMs),
    }
  })
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

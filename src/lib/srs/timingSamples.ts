import type { ReviewModeId } from "../../domain/types"
import { db } from "../db/schema"
import { newId } from "../db/id"

/**
 * Logs a raw prompt→reveal timing sample for later threshold calibration
 * (see the "Phase B" note in time-to-rating.ts). Stored in its own table,
 * unlinked from any card, so this whole dataset can be dropped once the
 * analysis is done without touching reviewEvents/scheduling.
 */
export async function recordTimingSample(
  modeId: ReviewModeId,
  responseMs: number,
  correct: boolean,
): Promise<void> {
  await db.timingSamples.put({
    id: newId(),
    ts: Date.now(),
    modeId,
    responseMs,
    correct,
  })
}

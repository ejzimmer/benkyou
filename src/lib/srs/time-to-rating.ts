import { Rating, type Grade } from "ts-fsrs"
import type { ReviewModeId } from "../../domain/types"

/** Seconds from seeing the prompt until “Show answer”. Tune per mode (typing vs oral). */
export type RevealThresholdsSec = {
  /** Below this → Easy (when self-correct) */
  easyBelow: number
  /** Below this → Good; at or above → Hard */
  goodBelow: number
}

export const REVEAL_THRESHOLDS_SEC: Record<ReviewModeId, RevealThresholdsSec> = {
  /** Oral recall — usually quicker than typing */
  vocab_oral_en: { easyBelow: 4, goodBelow: 18 },
  grammar_oral_meaning: { easyBelow: 5, goodBelow: 28 },
  /** Short hiragana typing */
  vocab_type_reading: { easyBelow: 6, goodBelow: 10 },
  /** Recall Japanese word from clues */
  vocab_type_word_from_clue: { easyBelow: 12, goodBelow: 15 },
  /** Typed construction — typically slowest */
  grammar_type_construction: { easyBelow: 20, goodBelow: 30 },
  /** Short hiragana typing, same pacing as the vocab reading quiz */
  grammar_type_reading: { easyBelow: 6, goodBelow: 10 },
}

/**
 * Maps prompt→reveal latency to an FSRS grade (when self-marked correct).
 * Incorrect always Again; a correct answer never drops to Again no matter how
 * slow, since Again forces a same-day relearn step and slowness alone doesn't
 * mean the card was forgotten — Hard is the floor. Phase B: calibrate
 * thresholds from review logs per user/mode.
 */
export function responseTimeToGrade(
  modeId: ReviewModeId,
  promptToRevealMs: number | null,
  selfCorrect: boolean,
): Grade {
  if (!selfCorrect) return Rating.Again

  const t = REVEAL_THRESHOLDS_SEC[modeId]
  if (promptToRevealMs == null || promptToRevealMs <= 0) return Rating.Good

  const s = promptToRevealMs / 1000
  if (s < t.easyBelow) return Rating.Easy
  if (s < t.goodBelow) return Rating.Good
  return Rating.Hard
}

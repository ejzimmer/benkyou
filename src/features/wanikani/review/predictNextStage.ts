import type { SpacedRepetitionSystem } from '../api/types'

// A prediction, not the real thing: WaniKani works out the new stage when a review
// is sent, and its answer replaces this one. We predict only so the SRS feed can
// show the change straight away, while the review waits out the typo window.
//
// WaniKani's rule: a fully correct item goes up one stage. Otherwise it drops by
// half its wrong answers (rounded up), doubled from Guru upwards, never below the starting stage.
export function predictNextStage(currentStage: number, incorrectAnswers: number, system: SpacedRepetitionSystem) {
  if (incorrectAnswers === 0) return Math.min(currentStage + 1, system.burning_stage_position)
  const penalty = currentStage >= system.passing_stage_position ? 2 : 1
  const drop = Math.ceil(incorrectAnswers / 2) * penalty
  return Math.max(currentStage - drop, system.starting_stage_position)
}

import type { Assignment } from '../api/types'

export function isReviewable(assignment: Assignment): assignment is Assignment & { available_at: string } {
  return !assignment.hidden && assignment.burned_at === null && assignment.srs_stage > 0 && assignment.available_at !== null
}

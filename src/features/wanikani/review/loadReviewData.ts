import type { SpacedRepetitionSystem } from '../api/types'
import { db } from '../data/db'
import type { StudyItem } from '../data/studyItem'
import { buildReviewQueue } from './buildReviewQueue'

export interface ReviewData {
  queue: StudyItem[]
  srsSystems: Map<number, SpacedRepetitionSystem>
}

export async function loadReviewData(): Promise<ReviewData> {
  const [stored, assignments, subjects, srsSystems] = await Promise.all([
    db.user.get('me'),
    db.assignments.toArray(),
    db.subjects.toArray(),
    db.spacedRepetitionSystems.toArray(),
  ])
  if (!stored) return { queue: [], srsSystems: new Map() }

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))
  return {
    queue: buildReviewQueue(assignments, subjectsById, stored.user, Temporal.Now.instant()),
    srsSystems: new Map(srsSystems.map((system) => [system.id, system.data])),
  }
}

export async function countDueReviews() {
  const { queue } = await loadReviewData()
  return queue.length
}

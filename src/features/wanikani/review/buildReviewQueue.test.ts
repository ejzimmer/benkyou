import { describe, expect, it } from 'vitest'
import type { Assignment, Resource, Subject, User } from '../api/types'
import { buildReviewQueue } from './buildReviewQueue'

const now = Temporal.Instant.from('2026-10-24T12:00:00Z')

const makeSubject = (id: number, level: number, hiddenAt: string | null = null) =>
  ({ id, data: { level, hidden_at: hiddenAt } }) as Resource<Subject>

const makeAssignment = (id: number, subjectId: number, fields: Partial<Assignment> = {}) =>
  ({
    id,
    data: {
      subject_id: subjectId,
      srs_stage: 3,
      available_at: '2026-10-24T11:00:00Z',
      burned_at: null,
      hidden: false,
      ...fields,
    },
  }) as Resource<Assignment>

const makeUser = (order: 'shuffled' | 'lower_levels_first', maxLevel = 60) =>
  ({ subscription: { max_level_granted: maxLevel }, preferences: { reviews_presentation_order: order } }) as User

const subjects = new Map(
  [makeSubject(1, 5), makeSubject(2, 1), makeSubject(3, 3), makeSubject(4, 2, '2025-01-01T00:00:00Z'), makeSubject(5, 4)].map(
    (s) => [s.id, s],
  ),
)

describe('buildReviewQueue', () => {
  it('includes only items that are due, unlocked, unburned and visible', () => {
    const assignments = [
      makeAssignment(10, 1),
      makeAssignment(11, 2, { available_at: '2026-10-24T13:00:00Z' }),
      makeAssignment(12, 3, { srs_stage: 0, available_at: null }),
      makeAssignment(13, 4),
      makeAssignment(14, 5, { hidden: true }),
      makeAssignment(15, 5, { burned_at: '2026-01-01T00:00:00Z', srs_stage: 9 }),
    ]
    const queue = buildReviewQueue(assignments, subjects, makeUser('shuffled'), now)
    expect(queue.map((item) => item.assignment.id)).toEqual([10])
  })

  it('leaves out levels above the subscription', () => {
    const queue = buildReviewQueue([makeAssignment(10, 1), makeAssignment(11, 2)], subjects, makeUser('shuffled', 3), now)
    expect(queue.map((item) => item.assignment.id)).toEqual([11])
  })

  it('puts lower levels first when the user prefers that', () => {
    const assignments = [makeAssignment(10, 1), makeAssignment(11, 2), makeAssignment(12, 3)]
    const queue = buildReviewQueue(assignments, subjects, makeUser('lower_levels_first'), now)
    expect(queue.map((item) => item.subject.data.level)).toEqual([1, 3, 5])
  })
})

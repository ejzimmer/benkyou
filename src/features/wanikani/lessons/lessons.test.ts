import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Assignment, Preferences, Resource, Subject, User } from '../api/types'
import { buildLessonQueue } from './buildLessonQueue'
import { countLessonsStartedToday } from './countLessonsStartedToday'
import { getLessonBatches, MAX_LESSONS_PER_DAY } from './getLessonBatches'

const makeSubject = (id: number, level: number, lessonPosition: number, hiddenAt: string | null = null) =>
  ({ id, data: { level, lesson_position: lessonPosition, hidden_at: hiddenAt } }) as Resource<Subject>

const makeAssignment = (id: number, subjectId: number, fields: Partial<Assignment> = {}) =>
  ({
    id,
    data: { subject_id: subjectId, unlocked_at: '2026-10-01T00:00:00Z', started_at: null, hidden: false, ...fields },
  }) as Resource<Assignment>

const makeUser = (order: Preferences['lessons_presentation_order'], maxLevel = 60) =>
  ({ subscription: { max_level_granted: maxLevel }, preferences: { lessons_presentation_order: order } }) as User

const subjects = new Map(
  [makeSubject(1, 2, 0), makeSubject(2, 1, 1), makeSubject(3, 1, 0), makeSubject(4, 1, 2, '2025-01-01T00:00:00Z')].map(
    (s) => [s.id, s],
  ),
)

describe('buildLessonQueue', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('includes only unlocked, unstarted, visible items', () => {
    const assignments = [
      makeAssignment(10, 1),
      makeAssignment(11, 2, { unlocked_at: null }),
      makeAssignment(12, 3, { started_at: '2026-10-02T00:00:00Z' }),
      makeAssignment(13, 4),
      makeAssignment(14, 1, { hidden: true }),
    ]
    const queue = buildLessonQueue(assignments, subjects, makeUser('ascending_level_then_subject'))
    expect(queue.map((item) => item.assignment.id)).toEqual([10])
  })

  it('leaves out levels above the subscription', () => {
    const queue = buildLessonQueue([makeAssignment(10, 1), makeAssignment(11, 2)], subjects, makeUser('shuffled', 1))
    expect(queue.map((item) => item.assignment.id)).toEqual([11])
  })

  it('orders by level, then lesson position', () => {
    const assignments = [makeAssignment(10, 1), makeAssignment(11, 2), makeAssignment(12, 3)]
    const queue = buildLessonQueue(assignments, subjects, makeUser('ascending_level_then_subject'))
    expect(queue.map((item) => item.subject.id)).toEqual([3, 2, 1])
  })

  it('shuffles within each level when asked to', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const assignments = [makeAssignment(10, 1), makeAssignment(11, 2), makeAssignment(12, 3)]
    const queue = buildLessonQueue(assignments, subjects, makeUser('ascending_level_then_shuffled'))
    expect(queue.map((item) => item.subject.data.level)).toEqual([1, 1, 2])
  })
})

describe('getLessonBatches', () => {
  const queue = Array.from({ length: 20 }, (_, i) => ({ assignment: makeAssignment(i, 1), subject: makeSubject(1, 1, 0) }))

  it('splits the day’s lessons into batches from the front of the queue', () => {
    expect(getLessonBatches(queue, 5, 0)).toEqual([queue.slice(0, 5), queue.slice(5, 10), queue.slice(10, 15)])
  })

  it('stops at the daily limit', () => {
    expect(getLessonBatches(queue, 5, MAX_LESSONS_PER_DAY - 7)).toEqual([queue.slice(0, 5), queue.slice(5, 7)])
    expect(getLessonBatches(queue, 5, MAX_LESSONS_PER_DAY)).toEqual([])
  })
})

describe('countLessonsStartedToday', () => {
  it('counts lessons started since midnight in the user’s time zone', () => {
    const now = Temporal.ZonedDateTime.from('2026-10-24T09:00:00+11:00[Australia/Sydney]')
    const assignments = [
      makeAssignment(1, 1, { started_at: '2026-10-23T14:00:00Z' }),
      makeAssignment(2, 1, { started_at: '2026-10-23T12:00:00Z' }),
      makeAssignment(3, 1),
    ]
    expect(countLessonsStartedToday(assignments, now)).toBe(1)
  })
})

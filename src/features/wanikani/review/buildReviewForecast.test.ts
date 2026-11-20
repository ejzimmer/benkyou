import { describe, expect, it } from 'vitest'
import type { Assignment, Resource, Subject, User } from '../api/types'
import { buildReviewForecast } from './buildReviewForecast'

const now = Temporal.ZonedDateTime.from('2026-10-25T09:30:00+11:00[Australia/Sydney]')

const makeSubject = (id: number, level = 1) => ({ id, data: { level, hidden_at: null } }) as Resource<Subject>

const makeAssignment = (id: number, availableAt: string | null, fields: Partial<Assignment> = {}) =>
  ({
    id,
    data: { subject_id: 1, srs_stage: 3, available_at: availableAt, burned_at: null, hidden: false, ...fields },
  }) as Resource<Assignment>

const user = { subscription: { max_level_granted: 60 } } as User
const subjects = new Map([[1, makeSubject(1)], [2, makeSubject(2, 10)]])

describe('buildReviewForecast', () => {
  it('counts reviews arriving in the next 24 hours, not ones already due', () => {
    const forecast = buildReviewForecast(
      [
        makeAssignment(1, '2026-10-24T20:00:00Z'),
        makeAssignment(2, '2026-10-25T01:00:00Z'),
        makeAssignment(3, '2026-10-25T08:00:00Z'),
        makeAssignment(4, '2026-10-26T01:00:00Z'),
      ],
      subjects,
      user,
      now,
    )
    expect(forecast.nextDayCount).toBe(2)
  })

  it('groups each day by local hour and keeps a running total that starts with what is due now', () => {
    const forecast = buildReviewForecast(
      [
        makeAssignment(1, '2026-10-24T20:00:00Z'),
        makeAssignment(2, '2026-10-25T01:00:00Z'),
        makeAssignment(3, '2026-10-25T01:00:00Z'),
        makeAssignment(4, '2026-10-25T03:00:00Z'),
        makeAssignment(5, '2026-10-25T14:00:00Z'),
      ],
      subjects,
      user,
      now,
    )
    const [today, tomorrow] = forecast.days

    expect(today.date.toString()).toBe('2026-10-25')
    expect(today.hours.map((hour) => [hour.start.hour, hour.count])).toEqual([[12, 2], [14, 1]])
    expect(today.count).toBe(3)
    expect(today.total).toBe(4)
    expect(tomorrow.count).toBe(1)
    expect(tomorrow.total).toBe(5)
    expect(forecast.days).toHaveLength(5)
  })

  it('leaves out lessons, burned and hidden items, and levels above the subscription', () => {
    const forecast = buildReviewForecast(
      [
        makeAssignment(1, null, { srs_stage: 0 }),
        makeAssignment(2, '2026-10-25T01:00:00Z', { burned_at: '2026-01-01T00:00:00Z' }),
        makeAssignment(3, '2026-10-25T01:00:00Z', { hidden: true }),
        makeAssignment(4, '2026-10-25T01:00:00Z', { subject_id: 2 }),
      ],
      subjects,
      { subscription: { max_level_granted: 3 } } as User,
      now,
    )
    expect(forecast.nextDayCount).toBe(0)
    expect(forecast.days[0].total).toBe(0)
  })
})

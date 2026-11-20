import type { Assignment, Resource, Subject, User } from '../api/types'
import { isSubjectAvailable } from '../data/availability'
import { isReviewable } from './isReviewable'

const FORECAST_DAYS = 5
const ONE_DAY = Temporal.Duration.from({ hours: 24 })

export interface ForecastHour {
  start: Temporal.ZonedDateTime
  count: number
}

export interface ForecastDay {
  date: Temporal.PlainDate
  hours: ForecastHour[]
  count: number
  total: number
}

export interface ReviewForecast {
  nextDayCount: number
  days: ForecastDay[]
}

export function buildReviewForecast(
  assignments: readonly Resource<Assignment>[],
  subjects: ReadonlyMap<number, Resource<Subject>>,
  user: User,
  now: Temporal.ZonedDateTime,
): ReviewForecast {
  const availableTimes = getAvailableTimes(assignments, subjects, user, now.timeZoneId)
  const upcomingTimes = availableTimes.filter((time) => Temporal.ZonedDateTime.compare(time, now) > 0)
  const nextDayEnd = now.add(ONE_DAY)

  let total = availableTimes.length - upcomingTimes.length
  const days = Array.from({ length: FORECAST_DAYS }, (_, i) => {
    const date = now.toPlainDate().add({ days: i })
    const hours = countByHour(upcomingTimes.filter((time) => time.toPlainDate().equals(date)))
    const count = hours.reduce((sum, hour) => sum + hour.count, 0)
    total += count
    return { date, hours, count, total }
  })

  return {
    nextDayCount: upcomingTimes.filter((time) => Temporal.ZonedDateTime.compare(time, nextDayEnd) <= 0).length,
    days,
  }
}

function getAvailableTimes(
  assignments: readonly Resource<Assignment>[],
  subjects: ReadonlyMap<number, Resource<Subject>>,
  user: User,
  timeZone: string,
) {
  return assignments.flatMap(({ data }) => {
    const subject = subjects.get(data.subject_id)
    if (!subject || !isReviewable(data) || !isSubjectAvailable(subject, user)) return []
    return [Temporal.Instant.from(data.available_at).toZonedDateTimeISO(timeZone)]
  })
}

function countByHour(times: readonly Temporal.ZonedDateTime[]): ForecastHour[] {
  const counts = new Map<string, ForecastHour>()
  for (const time of times) {
    const start = time.round({ smallestUnit: 'hour', roundingMode: 'floor' })
    const key = start.toString()
    counts.set(key, { start, count: (counts.get(key)?.count ?? 0) + 1 })
  }
  return [...counts.values()].toSorted((a, b) => Temporal.ZonedDateTime.compare(a.start, b.start))
}

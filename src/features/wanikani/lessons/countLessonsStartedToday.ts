import type { Assignment, Resource } from '../api/types'

export function countLessonsStartedToday(assignments: readonly Resource<Assignment>[], now: Temporal.ZonedDateTime) {
  return assignments.filter(({ data }) => data.started_at !== null && isSameDay(data.started_at, now)).length
}

function isSameDay(instant: string, now: Temporal.ZonedDateTime) {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(now.timeZoneId).toPlainDate().equals(now.toPlainDate())
}

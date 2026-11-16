import { db } from '../data/db'
import { buildReviewForecast } from './buildReviewForecast'

export async function loadReviewForecast() {
  const [stored, assignments, subjects] = await Promise.all([db.user.get('me'), db.assignments.toArray(), db.subjects.toArray()])
  if (!stored) return null

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))
  return buildReviewForecast(assignments, subjectsById, stored.user, Temporal.Now.zonedDateTimeISO())
}

import type { Resource, Subject } from '../api/types'
import { db } from '../data/db'
import type { StudyItem } from '../data/studyItem'
import { buildLessonQueue } from './buildLessonQueue'
import { countLessonsStartedToday } from './countLessonsStartedToday'
import { countLessonsLeftToday, getLessonBatches } from './getLessonBatches'

export interface LessonData {
  batches: StudyItem[][]
  subjectsById: Map<number, Resource<Subject>>
}

export async function loadLessonData(): Promise<LessonData> {
  const { user, queue, startedToday, subjectsById } = await loadLessonQueue()

  return {
    batches: user ? getLessonBatches(queue, user.preferences.lessons_batch_size, startedToday) : [],
    subjectsById,
  }
}

export async function countAvailableLessons() {
  const { queue, startedToday } = await loadLessonQueue()
  return countLessonsLeftToday(queue, startedToday)
}

async function loadLessonQueue() {
  const [stored, assignments, subjects] = await Promise.all([db.user.get('me'), db.assignments.toArray(), db.subjects.toArray()])
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))
  const user = stored?.user ?? null

  return {
    user,
    queue: user ? buildLessonQueue(assignments, subjectsById, user) : [],
    startedToday: countLessonsStartedToday(assignments, Temporal.Now.zonedDateTimeISO()),
    subjectsById,
  }
}

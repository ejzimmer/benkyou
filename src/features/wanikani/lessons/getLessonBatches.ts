import type { StudyItem } from '../data/studyItem'

export const MAX_LESSONS_PER_DAY = 15

export function getLessonBatches(queue: readonly StudyItem[], batchSize: number, startedToday: number) {
  const lessons = queue.slice(0, countLessonsLeftToday(queue, startedToday))
  return Array.from({ length: Math.ceil(lessons.length / batchSize) }, (_, index) =>
    lessons.slice(index * batchSize, (index + 1) * batchSize),
  )
}

export function countLessonsLeftToday(queue: readonly StudyItem[], startedToday: number) {
  return Math.min(queue.length, Math.max(MAX_LESSONS_PER_DAY - startedToday, 0))
}

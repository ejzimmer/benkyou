import type { Assignment, Preferences, Resource, Subject, User } from '../api/types'
import { isSubjectAvailable } from '../data/availability'
import { shuffle } from '../data/shuffle'
import type { StudyItem } from '../data/studyItem'

export function buildLessonQueue(
  assignments: readonly Resource<Assignment>[],
  subjects: ReadonlyMap<number, Resource<Subject>>,
  user: User,
): StudyItem[] {
  const items: StudyItem[] = []
  for (const assignment of assignments) {
    const subject = subjects.get(assignment.data.subject_id)
    if (subject && isReadyForLesson(assignment.data) && isSubjectAvailable(subject, user)) items.push({ assignment, subject })
  }

  return sortLessons(items, user.preferences.lessons_presentation_order)
}

function isReadyForLesson(assignment: Assignment) {
  return !assignment.hidden && assignment.unlocked_at !== null && assignment.started_at === null
}

function sortLessons(items: StudyItem[], order: Preferences['lessons_presentation_order']) {
  if (order === 'shuffled') return shuffle(items)
  if (order === 'ascending_level_then_shuffled') return shuffle(items).toSorted(compareLevels)
  return items.toSorted((a, b) => compareLevels(a, b) || compareLessonPositions(a, b))
}

function compareLevels(a: StudyItem, b: StudyItem) {
  return a.subject.data.level - b.subject.data.level
}

function compareLessonPositions(a: StudyItem, b: StudyItem) {
  return a.subject.data.lesson_position - b.subject.data.lesson_position
}

import type { Assignment, Resource, Subject } from '../api/types'

export interface StudyItem {
  assignment: Resource<Assignment>
  subject: Resource<Subject>
}

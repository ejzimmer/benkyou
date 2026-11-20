import { useLiveQuery } from 'dexie-react-hooks'
import type { Resource, Subject } from '../api/types'
import { getLookalikeSubjects } from '../data/getLookalikeSubjects'

const NO_SUBJECTS: readonly Resource<Subject>[] = []

export function useLookalikeSubjects(subject: Resource<Subject>): readonly Resource<Subject>[] {
  return useLiveQuery(() => getLookalikeSubjects(subject), [subject.id]) ?? NO_SUBJECTS
}

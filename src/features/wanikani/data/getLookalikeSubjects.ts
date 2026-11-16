import type { Resource, Subject } from '../api/types'
import { db } from './db'

export async function getLookalikeSubjects({ data }: Resource<Subject>): Promise<Resource<Subject>[]> {
  if (!data.characters) return []

  const relatedIds = [...(data.component_subject_ids ?? []), ...(data.amalgamation_subject_ids ?? [])]
  const related = await db.subjects.bulkGet(relatedIds)
  return related.filter((subject): subject is Resource<Subject> => subject?.data.characters === data.characters)
}

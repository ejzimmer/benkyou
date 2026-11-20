import { db } from '../data/db'

export async function getSynonyms(subjectId: number): Promise<string[]> {
  const material = await db.studyMaterials.where('data.subject_id').equals(subjectId).first()
  return material && !material.data.hidden ? material.data.meaning_synonyms : []
}

import type { WaniKaniClient } from '../api/client'
import type { Resource, StudyMaterial } from '../api/types'
import { db } from '../data/db'

export async function saveSynonyms(client: WaniKaniClient, subjectId: number, synonyms: readonly string[]) {
  const existing = await db.studyMaterials.where('data.subject_id').equals(subjectId).first()
  const material = existing
    ? await client.put<Resource<StudyMaterial>>(`/study_materials/${existing.id}`, {
        study_material: { meaning_synonyms: synonyms },
      })
    : await client.post<Resource<StudyMaterial>>('/study_materials', {
        study_material: { subject_id: subjectId, meaning_synonyms: synonyms },
      })
  await db.studyMaterials.put(material)
}

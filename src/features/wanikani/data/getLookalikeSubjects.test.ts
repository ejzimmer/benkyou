import { beforeEach, describe, expect, it } from 'vitest'
import type { Resource, Subject } from '../api/types'
import { clearDatabase, db } from './db'
import { getLookalikeSubjects } from './getLookalikeSubjects'

function makeSubject(id: number, object: string, data: Partial<Subject>): Resource<Subject> {
  return { id, object, url: '', data_updated_at: null, data: data as Subject }
}

describe('getLookalikeSubjects', () => {
  beforeEach(() => clearDatabase())

  it('finds related subjects written with the same characters', async () => {
    const radical = makeSubject(1, 'radical', { characters: '山', amalgamation_subject_ids: [2] })
    const kanji = makeSubject(2, 'kanji', { characters: '山', component_subject_ids: [1], amalgamation_subject_ids: [3, 4] })
    const vocabulary = makeSubject(3, 'vocabulary', { characters: '山', component_subject_ids: [2] })
    const longerVocabulary = makeSubject(4, 'vocabulary', { characters: '火山', component_subject_ids: [2] })
    await db.subjects.bulkPut([radical, kanji, vocabulary, longerVocabulary])

    expect(await getLookalikeSubjects(kanji)).toEqual([radical, vocabulary])
  })

  it('finds nothing for subjects without characters', async () => {
    expect(await getLookalikeSubjects(makeSubject(5, 'radical', { characters: null, amalgamation_subject_ids: [2] }))).toEqual([])
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { WaniKaniClient } from '../api/client'
import type { Resource, StudyMaterial } from '../api/types'
import { clearDatabase, db } from '../data/db'
import { addSynonym } from './addSynonym'
import { getSynonyms } from './getSynonyms'
import { saveSynonyms } from './saveSynonyms'

function makeStudyMaterial(id: number, data: Partial<StudyMaterial>): Resource<StudyMaterial> {
  return {
    id,
    object: 'study_material',
    url: '',
    data_updated_at: '2026-10-01T00:00:00Z',
    data: { subject_id: 1, subject_type: 'kanji', meaning_note: null, reading_note: null, meaning_synonyms: [], hidden: false, ...data },
  }
}

function makeFakeWaniKani() {
  const requests: { url: string; method?: string; body: unknown }[] = []
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { study_material: Partial<StudyMaterial> }
    requests.push({ url: String(url), method: init?.method, body })
    return Promise.resolve(Response.json(makeStudyMaterial(50, { subject_id: 1, ...body.study_material })))
  }
  return { client: new WaniKaniClient('t', { fetch: fetch as typeof globalThis.fetch }), requests }
}

describe('addSynonym', () => {
  it('adds the trimmed synonym to the end', () => {
    expect(addSynonym(['big'], '  large ')).toEqual(['big', 'large'])
  })

  it('leaves the list alone for a blank or already known synonym', () => {
    const synonyms = ['big']
    expect(addSynonym(synonyms, '  ')).toBe(synonyms)
    expect(addSynonym(synonyms, 'Big')).toBe(synonyms)
  })
})

describe('getSynonyms', () => {
  beforeEach(() => clearDatabase())

  it('gets the synonyms stored for the subject', async () => {
    await db.studyMaterials.bulkPut([
      makeStudyMaterial(50, { subject_id: 1, meaning_synonyms: ['big'] }),
      makeStudyMaterial(51, { subject_id: 2, meaning_synonyms: ['small'] }),
    ])

    expect(await getSynonyms(1)).toEqual(['big'])
  })

  it('gets nothing for a hidden study material or a subject without one', async () => {
    await db.studyMaterials.put(makeStudyMaterial(50, { subject_id: 1, meaning_synonyms: ['big'], hidden: true }))

    expect(await getSynonyms(1)).toEqual([])
    expect(await getSynonyms(2)).toEqual([])
  })
})

describe('saveSynonyms', () => {
  beforeEach(() => clearDatabase())

  it('creates a study material when the subject has none, and stores it', async () => {
    const { client, requests } = makeFakeWaniKani()

    await saveSynonyms(client, 1, ['big'])

    expect(requests).toEqual([
      {
        url: 'https://api.wanikani.com/v2/study_materials',
        method: 'POST',
        body: { study_material: { subject_id: 1, meaning_synonyms: ['big'] } },
      },
    ])
    expect(await getSynonyms(1)).toEqual(['big'])
  })

  it('updates only the synonyms of an existing study material', async () => {
    await db.studyMaterials.put(makeStudyMaterial(50, { subject_id: 1, meaning_synonyms: ['big', 'large'], meaning_note: 'note' }))
    const { client, requests } = makeFakeWaniKani()

    await saveSynonyms(client, 1, ['big'])

    expect(requests).toEqual([
      {
        url: 'https://api.wanikani.com/v2/study_materials/50',
        method: 'PUT',
        body: { study_material: { meaning_synonyms: ['big'] } },
      },
    ])
    expect(await getSynonyms(1)).toEqual(['big'])
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { WaniKaniClient } from '../api/client'
import type { Assignment, Resource } from '../api/types'
import { clearDatabase, db } from '../data/db'
import { queueLessonStart, sendPendingLessonStarts } from './sendLessonStarts'

function makeClientRespondingWith(...responses: (() => Response | Promise<Response>)[]) {
  const requests: { url: string; method?: string }[] = []
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), method: init?.method })
    return Promise.resolve(responses.shift()!())
  }
  return { client: new WaniKaniClient('t', { fetch: fetch as typeof globalThis.fetch }), requests }
}

const getStartedAssignment = () => Response.json({ id: 7, data_updated_at: null, data: { started_at: '2026-10-24T00:00:00Z' } })

const makeUnstartedAssignment = () => ({ id: 7, data_updated_at: null, data: { started_at: null } }) as unknown as Resource<Assignment>

describe('sending lesson starts', () => {
  beforeEach(() => clearDatabase())

  it('marks the lesson started locally straight away', async () => {
    await db.assignments.put(makeUnstartedAssignment())
    await queueLessonStart(7)
    expect((await db.assignments.get(7))?.data.started_at).not.toBeNull()
  })

  it('starts the assignment on WaniKani and stores what comes back', async () => {
    const { client, requests } = makeClientRespondingWith(getStartedAssignment)
    await queueLessonStart(7)
    await sendPendingLessonStarts(client)

    expect(requests).toEqual([{ url: 'https://api.wanikani.com/v2/assignments/7/start', method: 'PUT' }])
    expect((await db.assignments.get(7))?.data).toEqual({ started_at: '2026-10-24T00:00:00Z' })
    expect(await db.pendingLessonStarts.count()).toBe(0)
  })

  it('keeps the start when WaniKani can’t be reached, and sends it later', async () => {
    const { client } = makeClientRespondingWith(() => Promise.reject(new TypeError('offline')), getStartedAssignment)
    await queueLessonStart(7)
    await sendPendingLessonStarts(client)
    expect(await db.pendingLessonStarts.count()).toBe(1)

    await sendPendingLessonStarts(client)
    expect(await db.pendingLessonStarts.count()).toBe(0)
  })

  it('drops a start WaniKani rejects for good', async () => {
    const { client } = makeClientRespondingWith(() => Response.json({ error: 'already started' }, { status: 422 }))
    await queueLessonStart(7)
    await sendPendingLessonStarts(client)
    expect(await db.pendingLessonStarts.count()).toBe(0)
  })
})

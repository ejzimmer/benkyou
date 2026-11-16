import { beforeEach, describe, expect, it } from 'vitest'
import { WaniKaniClient } from '../api/client'
import { clearDatabase, db } from '../data/db'
import { queueReview, sendPendingReviews } from './sendReviews'

const review = { assignmentId: 7, incorrectMeaningAnswers: 1, incorrectReadingAnswers: 0 }

function makeClientRespondingWith(...responses: (() => Response | Promise<Response>)[]) {
  const sentBodies: unknown[] = []
  const fetch = (_url: string | URL | Request, init?: RequestInit) => {
    sentBodies.push(JSON.parse(String(init?.body)))
    return Promise.resolve(responses.shift()!())
  }
  return { client: new WaniKaniClient('t', { fetch: fetch as typeof globalThis.fetch }), sentBodies }
}

const getUpdatedResources = () =>
  Response.json(
    {
      resources_updated: {
        assignment: { id: 7, data_updated_at: null, data: { srs_stage: 4 } },
        review_statistic: { id: 70, data_updated_at: null, data: { subject_id: 1 } },
      },
    },
    { status: 201 },
  )

describe('sending reviews', () => {
  beforeEach(() => clearDatabase())

  it('sends a review and stores the updated assignment', async () => {
    const { client, sentBodies } = makeClientRespondingWith(getUpdatedResources)
    await queueReview(review)
    await sendPendingReviews(client)

    expect(sentBodies).toEqual([{ review: { assignment_id: 7, incorrect_meaning_answers: 1, incorrect_reading_answers: 0 } }])
    expect((await db.assignments.get(7))?.data).toEqual({ srs_stage: 4 })
    expect(await db.pendingReviews.count()).toBe(0)
  })

  it('keeps the review when WaniKani can’t be reached, and sends it later', async () => {
    const { client } = makeClientRespondingWith(() => Promise.reject(new TypeError('offline')), getUpdatedResources)
    await queueReview(review)
    await sendPendingReviews(client)
    expect(await db.pendingReviews.count()).toBe(1)

    await sendPendingReviews(client)
    expect(await db.pendingReviews.count()).toBe(0)
  })

  it('drops a review WaniKani rejects for good', async () => {
    const { client } = makeClientRespondingWith(() => Response.json({ error: 'not available' }, { status: 422 }))
    await queueReview(review)
    await sendPendingReviews(client)
    expect(await db.pendingReviews.count()).toBe(0)
  })
})

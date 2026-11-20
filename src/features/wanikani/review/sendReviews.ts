import type { WaniKaniClient } from '../api/client'
import { isRejectedForGood } from '../api/errors'
import type { CreatedReview } from '../api/types'
import { db, type PendingReview } from '../data/db'

let sending: Promise<void> | null = null

export async function queueReview(review: Omit<PendingReview, 'id' | 'createdAt'>) {
  await db.pendingReviews.add({ ...review, createdAt: Temporal.Now.instant().toString() })
}

export function sendPendingReviews(client: WaniKaniClient): Promise<void> {
  sending ??= sendAll(client).finally(() => {
    sending = null
  })
  return sending
}

async function sendAll(client: WaniKaniClient) {
  while (true) {
    // Each review is sent only after the one before it, so a failure leaves the rest queued in order.
    // oxlint-disable-next-line no-await-in-loop
    const review = await db.pendingReviews.orderBy('id').first()
    if (!review) return
    // oxlint-disable-next-line no-await-in-loop
    const isSent = await sendReview(client, review)
    if (!isSent) return
  }
}

async function sendReview(client: WaniKaniClient, review: PendingReview) {
  try {
    const { resources_updated: updated } = await client.post<CreatedReview>('/reviews', {
      review: {
        assignment_id: review.assignmentId,
        incorrect_meaning_answers: review.incorrectMeaningAnswers,
        incorrect_reading_answers: review.incorrectReadingAnswers,
      },
    })

    await db.transaction('rw', db.assignments, db.reviewStatistics, db.pendingReviews, async () => {
      await db.assignments.put(updated.assignment)
      await db.reviewStatistics.put(updated.review_statistic)
      await db.pendingReviews.delete(review.id!)
    })

    return true
  } catch (error) {
    if (!isRejectedForGood(error)) return false

    await db.pendingReviews.delete(review.id!)
    return true
  }
}

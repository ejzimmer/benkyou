import type { WaniKaniClient } from '../api/client'
import { isRejectedForGood } from '../api/errors'
import type { Assignment, Resource } from '../api/types'
import { db, type PendingLessonStart } from '../data/db'

let sending: Promise<void> | null = null

export async function queueLessonStart(assignmentId: number) {
  const startedAt = Temporal.Now.instant().toString()
  await db.transaction('rw', db.assignments, db.pendingLessonStarts, async () => {
    await db.pendingLessonStarts.put({ assignmentId, createdAt: startedAt })
    // Marked started locally straight away, so the lesson isn't offered again while the start is still queued.
    await db.assignments.where('id').equals(assignmentId).modify((assignment) => {
      assignment.data.started_at ??= startedAt
    })
  })
}

export function sendPendingLessonStarts(client: WaniKaniClient): Promise<void> {
  sending ??= sendAll(client).finally(() => {
    sending = null
  })
  return sending
}

async function sendAll(client: WaniKaniClient) {
  while (true) {
    // oxlint-disable-next-line no-await-in-loop
    const lessonStart = await db.pendingLessonStarts.orderBy('createdAt').first()
    if (!lessonStart) return
    // oxlint-disable-next-line no-await-in-loop
    const isSent = await sendLessonStart(client, lessonStart)
    if (!isSent) return
  }
}

async function sendLessonStart(client: WaniKaniClient, { assignmentId }: PendingLessonStart) {
  try {
    const assignment = await client.put<Resource<Assignment>>(`/assignments/${assignmentId}/start`, {})
    await db.transaction('rw', db.assignments, db.pendingLessonStarts, async () => {
      await db.assignments.put(assignment)
      await db.pendingLessonStarts.delete(assignmentId)
    })
    return true
  } catch (error) {
    if (!isRejectedForGood(error)) return false

    await db.pendingLessonStarts.delete(assignmentId)
    return true
  }
}

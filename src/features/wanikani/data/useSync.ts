import { useCallback, useEffect, useState } from 'react'
import type { WaniKaniClient } from '../api/client'
import { ApiError } from '../api/errors'
import { sendPendingLessonStarts } from '../lessons/sendLessonStarts'
import { sendPendingReviews } from '../review/sendReviews'
import { sync } from './sync'

export function useSync(client: WaniKaniClient, onUnauthorized: () => void) {
  const [isSyncing, setIsSyncing] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [hasFinishedFirstSync, setHasFinishedFirstSync] = useState(false)

  const runSync = useCallback(
    () =>
      // Send any lesson starts and reviews left over from last time before fetching, so the sync sees their results.
      sendPendingLessonStarts(client)
        .then(() => sendPendingReviews(client))
        .then(() => sync(client))
        .then(() => setSyncError(null))
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 401) onUnauthorized()
          else setSyncError('Sync failed. Showing what was already saved.')
        })
        .finally(() => {
          setIsSyncing(false)
          setHasFinishedFirstSync(true)
        }),
    [client, onUnauthorized],
  )

  useEffect(() => {
    void runSync()
  }, [runSync])

  function syncNow() {
    setIsSyncing(true)
    void runSync()
  }

  return { isSyncing, hasFinishedFirstSync, syncError, syncNow }
}

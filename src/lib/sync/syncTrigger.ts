/**
 * Throttled sync trigger for the document `visibilitychange` event.
 *
 * Mobile browsers fire `visibilitychange` whenever the user locks the screen,
 * switches apps, dismisses a notification, etc. Without throttling, a tab that
 * stays open all day can run a full Firestore sync many times per hour, which
 * users perceive as "sync runs randomly" and which wastes mobile data + the
 * Firestore read quota.
 *
 * `onVisible()` invokes `syncNow` at most once every `minIntervalMs`; any
 * extra calls inside the throttle window resolve immediately without firing.
 */

import { syncLog } from "./syncLog"

export type VisibilitySyncTriggerOptions = {
  syncNow: () => Promise<void>
  now?: () => number
  /** Minimum wall-clock interval between visibility-triggered runs. */
  minIntervalMs?: number
}

export type VisibilitySyncTrigger = {
  onVisible: () => Promise<void>
}

export const DEFAULT_VISIBILITY_SYNC_INTERVAL_MS = 60_000

export function createVisibilitySyncTrigger(
  options: VisibilitySyncTriggerOptions,
): VisibilitySyncTrigger {
  const {
    syncNow,
    now = () => Date.now(),
    minIntervalMs = DEFAULT_VISIBILITY_SYNC_INTERVAL_MS,
  } = options
  let lastRunAt = Number.NEGATIVE_INFINITY
  return {
    async onVisible() {
      const t = now()
      const elapsed = t - lastRunAt
      if (elapsed < minIntervalMs) {
        syncLog("visibility sync skipped (throttled)", {
          msSinceLast: Math.round(elapsed),
          minIntervalMs,
        })
        return
      }
      lastRunAt = t
      await syncNow()
    },
  }
}

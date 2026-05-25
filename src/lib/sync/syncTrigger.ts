/**
 * Throttled sync trigger for the document `visibilitychange` event.
 *
 * Mobile browsers fire `visibilitychange` whenever the user locks the screen,
 * switches apps, dismisses a notification, etc. Without throttling, a tab that
 * stays open all day can run a full Firestore sync many times per hour, which
 * users perceive as "sync runs randomly" and which wastes mobile data + the
 * Firestore read quota.
 *
 * NOTE: This module is currently a stub — it does *not* throttle yet. The fix
 * for the reported bug will replace the body of `onVisible` with real
 * throttling using `lastRunAt`. The failing diagnostic test in
 * `importSyncDiagnostic.test.ts` pins the expected behaviour.
 */

export type VisibilitySyncTriggerOptions = {
  syncNow: () => Promise<void>
  now?: () => number
  /** Minimum wall-clock interval between visibility-triggered runs. */
  minIntervalMs?: number
}

export type VisibilitySyncTrigger = {
  onVisible: () => Promise<void>
}

export function createVisibilitySyncTrigger(
  options: VisibilitySyncTriggerOptions,
): VisibilitySyncTrigger {
  const { syncNow } = options
  return {
    async onVisible() {
      await syncNow()
    },
  }
}

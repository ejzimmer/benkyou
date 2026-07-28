import { useEffect } from "react"

/**
 * Tracks elapsed wall-clock time (paused while the tab is hidden) and a count
 * of cards judged correct for one review session, keyed by `scopeKey`
 * (deckId, or "all" for the unscoped review). Backed by `sessionStorage`
 * rather than component state so it survives the remount that happens when
 * the user navigates away mid-session to edit a card and back
 * (`resumeCardId` flow in `ReviewSessionPage`).
 */
type TimerState = {
  accumulatedMs: number
  /** `Date.now()` the current running segment began, or null while paused. */
  runningSince: number | null
  reviewedCount: number
}

const STORAGE_PREFIX = "benkyou:reviewSessionTimer:"

function storageKey(scopeKey: string): string {
  return `${STORAGE_PREFIX}${scopeKey}`
}

function readState(scopeKey: string): TimerState | null {
  try {
    const raw = sessionStorage.getItem(storageKey(scopeKey))
    return raw ? (JSON.parse(raw) as TimerState) : null
  } catch {
    return null
  }
}

function writeState(scopeKey: string, state: TimerState) {
  try {
    sessionStorage.setItem(storageKey(scopeKey), JSON.stringify(state))
  } catch {
    // Storage unavailable (private browsing, quota) — the session just
    // won't have a duration/count to show at the end.
  }
}

function isHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden"
}

/** Starts a fresh timer for this scope, replacing any prior state. */
export function startReviewSessionTimer(scopeKey: string) {
  writeState(scopeKey, {
    accumulatedMs: 0,
    reviewedCount: 0,
    runningSince: isHidden() ? null : Date.now(),
  })
}

/**
 * Picks a timer for this scope back up (e.g. returning from editing a card
 * mid-session) instead of starting from zero. Returns false if there's
 * nothing stored to resume, so the caller can start a fresh one instead.
 */
export function resumeReviewSessionTimerIfPresent(scopeKey: string): boolean {
  const state = readState(scopeKey)
  if (!state) return false
  if (state.runningSince == null && !isHidden()) {
    writeState(scopeKey, { ...state, runningSince: Date.now() })
  }
  return true
}

export function pauseReviewSessionTimer(scopeKey: string) {
  const state = readState(scopeKey)
  if (!state || state.runningSince == null) return
  writeState(scopeKey, {
    ...state,
    accumulatedMs: state.accumulatedMs + (Date.now() - state.runningSince),
    runningSince: null,
  })
}

export function unpauseReviewSessionTimer(scopeKey: string) {
  const state = readState(scopeKey)
  if (!state || state.runningSince != null) return
  writeState(scopeKey, { ...state, runningSince: Date.now() })
}

export function incrementReviewedCount(scopeKey: string) {
  const state = readState(scopeKey)
  if (!state) return
  writeState(scopeKey, { ...state, reviewedCount: state.reviewedCount + 1 })
}

export function decrementReviewedCount(scopeKey: string) {
  const state = readState(scopeKey)
  if (!state) return
  writeState(scopeKey, {
    ...state,
    reviewedCount: Math.max(0, state.reviewedCount - 1),
  })
}

export function getReviewSessionElapsedMs(scopeKey: string): number {
  const state = readState(scopeKey)
  if (!state) return 0
  const running = state.runningSince != null ? Date.now() - state.runningSince : 0
  return state.accumulatedMs + running
}

export function getReviewedCount(scopeKey: string): number {
  return readState(scopeKey)?.reviewedCount ?? 0
}

/** Pauses/resumes the named session timer while the tab is hidden/visible. */
export function useReviewSessionTimerVisibility(scopeKey: string) {
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        pauseReviewSessionTimer(scopeKey)
      } else {
        unpauseReviewSessionTimer(scopeKey)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [scopeKey])
}

import { useEffect, useRef, useState } from "react"

export type WakeLockStatus = "idle" | "active" | "unsupported" | "unavailable"

/**
 * Keeps the screen awake while `active` is true — e.g. during a long Anki
 * import — so a phone that locks its screen doesn't leave the user unsure
 * whether the import is still running or silently died mid-way. Falls back
 * to reporting "unsupported"/"unavailable" on browsers without the Wake
 * Lock API (or when the request is refused), so the caller can tell the
 * user to keep the screen on manually instead.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("idle")
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active) {
      setStatus("idle")
      return
    }
    if (!("wakeLock" in navigator)) {
      setStatus("unsupported")
      return
    }

    let cancelled = false

    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock.request("screen")
        if (cancelled) {
          await sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        setStatus("active")
      } catch {
        // Permission refused, battery saver, etc. — the import proceeds
        // without a wake lock; the UI falls back to a manual reminder.
        setStatus("unavailable")
      }
    }

    void acquire()

    // The lock is released automatically when the tab is hidden; reacquire
    // once it's visible again so it survives brief app-switches.
    function onVisibility() {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        void acquire()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibility)
      void sentinelRef.current?.release()
      sentinelRef.current = null
    }
  }, [active])

  return status
}

import { useEffect, useRef, useState } from "react"
import Dexie from "dexie"

/**
 * Like dexie-react-hooks' `useLiveQuery`, but recomputes at most once every
 * `waitMs` instead of once per Dexie write. A sync writes one changed row at
 * a time (by design — see runSync.ts), so a plain `useLiveQuery` wrapping a
 * full-table scan (e.g. due counts across every card) reruns that scan once
 * per row during a sync and saturates the main thread, which is what made
 * the app feel unresponsive while a sync was still running.
 */
export function useDebouncedQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[],
  waitMs = 300,
): T | undefined {
  const [value, setValue] = useState<T>()
  const queryRef = useRef(queryFn)
  queryRef.current = queryFn

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let running = false
    let rerunRequested = false

    async function recompute() {
      if (running) {
        rerunRequested = true
        return
      }
      running = true
      try {
        const result = await queryRef.current()
        if (!cancelled) setValue(result)
      } catch (e) {
        console.error(e)
      } finally {
        running = false
      }
      if (cancelled) return
      if (rerunRequested) {
        rerunRequested = false
        schedule()
      }
    }

    function schedule() {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        void recompute()
      }, waitMs)
    }

    void recompute()
    Dexie.on("storagemutated", schedule)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      Dexie.on.storagemutated.unsubscribe(schedule)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return value
}

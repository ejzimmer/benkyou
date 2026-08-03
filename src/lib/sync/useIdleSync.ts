import { useEffect, useRef } from "react"

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const

/**
 * Calls `onIdle` once the user has gone `timeoutMs` without any input
 * activity, then waits for the next activity event before it can fire
 * again — so a tab left open for hours only triggers one sync per idle
 * stretch rather than repeatedly.
 */
export function useIdleSync(
  enabled: boolean,
  onIdle: () => void,
  timeoutMs: number,
) {
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return

    let timer: ReturnType<typeof setTimeout>

    function reset() {
      clearTimeout(timer)
      timer = setTimeout(() => onIdleRef.current(), timeoutMs)
    }

    reset()
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true })
    }

    return () => {
      clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset)
      }
    }
  }, [enabled, timeoutMs])
}

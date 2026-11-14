import { useSyncExternalStore } from "react"

// Must match the `max-width: 759.98px` media query in index.css that lays the
// review cards out as one flip card.
const PHONE_REVIEW_QUERY = "(max-width: 759.98px)"

function subscribeToPhoneQuery(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {}
  const query = window.matchMedia(PHONE_REVIEW_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function readPhoneQueryMatch() {
  if (typeof window.matchMedia !== "function") return false
  return window.matchMedia(PHONE_REVIEW_QUERY).matches
}

/** True while the review screen is narrow enough to show a single flip card
 * instead of the question and answer cards side by side. */
export function usePhoneReviewLayout(): boolean {
  return useSyncExternalStore(subscribeToPhoneQuery, readPhoneQueryMatch)
}

import type { User } from "firebase/auth"
import { getFirestoreDb, getFirebaseStorage } from "../firebase"
import { runPushOnly } from "./runSync"

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pushInFlight: Promise<void> | null = null

/**
 * Each mutation already writes its own document straight to Firestore (see
 * `pushDocInBackground` below), so this debounce isn't for freshness — it's
 * a periodic safety-net resync (orphaned deletes, media cleanup). It only
 * needs to run once activity has actually settled, not after every single
 * review answer, so it's long relative to the gap between review actions.
 */
const FULL_PUSH_DEBOUNCE_MS = 30_000

export function schedulePushAfterMutation(user: User | null): void {
  if (!user) return
  const fs = getFirestoreDb()
  const storage = getFirebaseStorage()
  if (!fs || !storage) return

  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    if (pushInFlight) return
    pushInFlight = runPushOnly(fs, storage, user.uid)
      .catch((e) => {
        console.error("Background sync push failed:", e)
      })
      .finally(() => {
        pushInFlight = null
      })
  }, FULL_PUSH_DEBOUNCE_MS)
}

/**
 * Fire a single-document remote write without making the caller (and thus
 * the UI) wait on a network round trip. The local IndexedDB write has
 * already committed by the time this is called, so the data isn't lost if
 * this fails or the tab closes first — the next full sync picks it up.
 */
export function pushDocInBackground(write: Promise<unknown>): void {
  write.catch((e) => {
    console.error("Background document push failed:", e)
  })
}

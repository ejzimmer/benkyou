import type { User } from "firebase/auth"
import { getFirestoreDb, getFirebaseStorage } from "../firebase"
import { runPushOnly } from "./runSync"

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pushInFlight: Promise<void> | null = null

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
  }, 1500)
}

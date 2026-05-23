import { getAuth, type User } from "firebase/auth"
import {
  enableNetwork,
  type Firestore,
} from "firebase/firestore"
import { getFirebaseApp, getFirestoreDb } from "../firebase"
import { syncLog } from "./syncLog"

/** Fail fast instead of hanging forever on blocked Firestore WebChannel. */
export const FIRESTORE_OP_TIMEOUT_MS = 30_000

export function withSyncTimeout<T>(
  promise: Promise<T>,
  label: string,
  ms = FIRESTORE_OP_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${Math.round(ms / 1000)}s. Is Cloud Firestore enabled in this Firebase project? (Realtime Database alone is not enough.) Also check network, ad blockers, and firestore.rules.`,
        ),
      )
    }, ms)
    promise
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}

/**
 * Ensure Auth token is on the wire and Firestore is online before reads.
 */
export async function prepareFirestoreForSync(_user: User): Promise<Firestore> {
  const app = getFirebaseApp()
  const fs = getFirestoreDb()
  if (!app || !fs) {
    throw new Error("Firebase is not configured")
  }

  const auth = getAuth(app)
  if (!auth.currentUser) {
    throw new Error("Not signed in to Firebase Auth")
  }

  syncLog("prepareFirestore: fetching auth token")
  const token = await withSyncTimeout(
    auth.currentUser.getIdToken(),
    "Firebase Auth getIdToken",
    15_000,
  )
  syncLog("prepareFirestore: auth token ready", {
    uid: auth.currentUser.uid,
    tokenLength: token.length,
  })

  syncLog("prepareFirestore: enableNetwork")
  await withSyncTimeout(enableNetwork(fs), "Firestore enableNetwork", 10_000)
  syncLog("prepareFirestore: ready")

  return fs
}

import { initializeApp, type FirebaseApp } from "firebase/app"
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const env: ImportMetaEnv =
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as ImportMetaEnv)

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID ?? "",
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
}

let appInstance: FirebaseApp | null = null
let firestoreInstance: Firestore | null = null
let storageInstance: FirebaseStorage | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (!appInstance) appInstance = initializeApp(firebaseConfig)
  return appInstance
}

/**
 * Memory-only Firestore cache for sync. Persistent offline cache can leave
 * getDocs() waiting indefinitely when the WebChannel never connects.
 */
export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp()
  if (!app) return null
  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: memoryLocalCache(),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("already been called")) {
        firestoreInstance = getFirestore(app)
      } else {
        throw err
      }
    }
  }
  return firestoreInstance
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp()
  if (!app || !firebaseConfig.storageBucket) return null
  if (!storageInstance) storageInstance = getStorage(app)
  return storageInstance
}

export function warmFirebaseClients(): void {
  if (!isFirebaseConfigured()) return
  getFirestoreDb()
  getFirebaseStorage()
}

import { initializeApp, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
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

/** One Firestore instance per app — do not call initializeFirestore() repeatedly. */
export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp()
  if (!app) return null
  if (!firestoreInstance) firestoreInstance = getFirestore(app)
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

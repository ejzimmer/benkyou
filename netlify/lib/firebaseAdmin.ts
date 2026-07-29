import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

function loadCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (see docs/AGENT_API.md)",
    )
  }
  // Netlify env vars can't hold literal newlines, so the private key is stored with escaped "\n".
  return cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") })
}

export function getAdminFirestore(): Firestore {
  const app = getApps()[0] ?? initializeApp({ credential: loadCredential() })
  return getFirestore(app)
}

/** This API only ever serves one person's deck — the account owner's Firestore uid. */
export function requireAgentUid(): string {
  const uid = process.env.AGENT_FIREBASE_UID
  if (!uid) {
    throw new Error("Missing AGENT_FIREBASE_UID (see docs/AGENT_API.md)")
  }
  return uid
}

import {
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth'
import { getFirebaseApp } from '../../lib/firebase'
import { getJournalAuth } from './journalStorage'

// Journal's Firebase project won't accept benkyou's domain for popup
// sign-in, so the Google popup runs on benkyou's own project and its access
// token signs in to journal's project, which doesn't check the domain.
export async function signInToJournal() {
  const benkyouApp = getFirebaseApp()
  if (!benkyouApp) {
    return signInWithPopup(getJournalAuth(), new GoogleAuthProvider())
  }

  const result = await signInWithPopup(
    getAuth(benkyouApp),
    new GoogleAuthProvider(),
  )
  const accessToken =
    GoogleAuthProvider.credentialFromResult(result)?.accessToken
  if (!accessToken) throw new Error('Google returned no access token')

  return signInWithCredential(
    getJournalAuth(),
    GoogleAuthProvider.credential(null, accessToken),
  )
}

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { getJournalAuth } from './journalStorage'

export function signInToJournal() {
  return signInWithPopup(getJournalAuth(), new GoogleAuthProvider())
}

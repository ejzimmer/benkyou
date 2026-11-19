import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { createLocalFirstContext } from '../../journal/localFirst/createLocalFirstContext'

// The garden's data stays in journal's Realtime Database, so journal and
// benkyou read and write the same garden.
const JOURNAL_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAlKw5_aMOUlR3SdkbU6vHADLTUvXZHNJg',
  authDomain: 'journal-50dcf.firebaseapp.com',
  projectId: 'journal-50dcf',
  storageBucket: 'journal-50dcf.appspot.com',
  messagingSenderId: '212303689127',
  appId: '1:212303689127:web:4cb9352399529de15ff282',
  databaseURL:
    'https://journal-50dcf-default-rtdb.asia-southeast1.firebasedatabase.app',
}

let journalApp: FirebaseApp | undefined
let journalStorage: ReturnType<typeof createLocalFirstContext> | undefined
let hydration: Promise<void> | undefined

function getJournalApp() {
  journalApp ??= initializeApp(JOURNAL_FIREBASE_CONFIG, 'journal')
  return journalApp
}

export function getJournalAuth() {
  return getAuth(getJournalApp())
}

export function getJournalStorage() {
  journalStorage ??= createLocalFirstContext(
    getDatabase(getJournalApp()),
    'benkyou-media-local-first',
  )
  return journalStorage
}

export function hydrateJournalStorage() {
  hydration ??= getJournalStorage().hydrate()
  return hydration
}

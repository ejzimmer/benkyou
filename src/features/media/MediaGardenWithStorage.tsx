import { use } from 'react'
import { ConflictBanner } from './shared/ConflictBanner'
import { FirebaseContext } from './shared/FirebaseContext'
import { SaveStatusBanner } from './shared/SaveStatusBanner'
import { LanguageMediaStorageProvider } from './garden/LanguageMediaStorageContext'
import { MediaGarden } from './garden/MediaGarden'
import { getJournalStorage, hydrateJournalStorage } from './journalStorage'

export function MediaGardenWithStorage() {
  use(hydrateJournalStorage())
  const { context, saveStatus, conflictStatus } = getJournalStorage()

  return (
    <FirebaseContext.Provider value={context}>
      <LanguageMediaStorageProvider>
        <MediaGarden />
      </LanguageMediaStorageProvider>
      <SaveStatusBanner saveStatus={saveStatus} />
      <ConflictBanner conflictStatus={conflictStatus} />
    </FirebaseContext.Provider>
  )
}

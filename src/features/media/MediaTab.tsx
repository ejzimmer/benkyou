import { Suspense } from 'react'
import { AuthGate } from '../../journal/AuthGate'
import { GardenErrorBoundary } from './GardenErrorBoundary'
import { MediaGardenWithStorage } from './MediaGardenWithStorage'
import { getJournalAuth } from './journalStorage'
import { signInToJournal } from './signInToJournal'
import { Loading } from '../../journal/loading'
import './MediaTab.css'

export function MediaTab() {
  return (
    <div className="media">
      <AuthGate auth={getJournalAuth()} logIn={signInToJournal}>
        <GardenErrorBoundary>
          <Suspense fallback={<Loading />}>
            <MediaGardenWithStorage />
          </Suspense>
        </GardenErrorBoundary>
      </AuthGate>
    </div>
  )
}

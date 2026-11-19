import { Suspense } from 'react'
import { AuthGate } from './shared/AuthGate'
import { MediaGardenWithStorage } from './MediaGardenWithStorage'
import { getJournalAuth } from './journalStorage'
import { Loading } from './shared/loading'
import './MediaTab.css'

export function MediaTab() {
  return (
    <div className="media">
      <AuthGate auth={getJournalAuth()}>
        <Suspense fallback={<Loading />}>
          <MediaGardenWithStorage />
        </Suspense>
      </AuthGate>
    </div>
  )
}

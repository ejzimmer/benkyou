import './WaniKaniTab.css'
import { useSyncExternalStore } from 'react'
import type { User } from './api/types'
import { GemDefs } from './components/GemDefs'
import { db } from './data/db'
import { HomeScreen } from './screens/HomeScreen'
import { TokenScreen } from './screens/TokenScreen'
import { signOutOfWaniKani } from './signOutOfWaniKani'
import { getToken, saveToken, subscribeToToken } from './token'

export function WaniKaniTab() {
  const token = useSyncExternalStore(subscribeToToken, getToken)

  async function signIn(newToken: string, newUser: User) {
    await db.user.put({ id: 'me', user: newUser, syncedAt: Temporal.Now.instant().toString() })
    saveToken(newToken)
  }

  return (
    <div className="wanikani">
      <GemDefs />
      <main className="centre">
        {token === null ? (
          <TokenScreen onSignedIn={signIn} />
        ) : (
          <HomeScreen key={token} token={token} onUnauthorized={() => void signOutOfWaniKani()} />
        )}
      </main>
    </div>
  )
}

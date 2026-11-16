import './WaniKaniTab.css'
import { useCallback, useLayoutEffect, useState } from 'react'
import type { User } from './api/types'
import { FontStyleSwitch } from './components/FontStyleSwitch'
import { GemDefs } from './components/GemDefs'
import { SignOutButton } from './components/SignOutButton'
import { clearDatabase, db } from './data/db'
import { applyFontStyle, type FontStyle, getFontStyle, saveFontStyle } from './fontStyle'
import { HomeScreen } from './screens/HomeScreen'
import { TokenScreen } from './screens/TokenScreen'
import { clearToken, getToken, saveToken } from './token'

export function WaniKaniTab() {
  const [token, setToken] = useState(getToken)
  const [fontStyle, setFontStyle] = useState(getFontStyle)

  useLayoutEffect(() => applyFontStyle(fontStyle), [fontStyle])

  function changeFontStyle(newFontStyle: FontStyle) {
    saveFontStyle(newFontStyle)
    setFontStyle(newFontStyle)
  }

  const signOut = useCallback(() => {
    clearToken()
    setToken(null)
    void clearDatabase()
  }, [])

  async function signIn(newToken: string, newUser: User) {
    saveToken(newToken)
    await db.user.put({ id: 'me', user: newUser, syncedAt: Temporal.Now.instant().toString() })
    setToken(newToken)
  }

  return (
    <div className="wanikani">
      <GemDefs />
      <header className="bar">
        <div className="actions">
          <FontStyleSwitch fontStyle={fontStyle} onChange={changeFontStyle} />
          {token && (
            <SignOutButton onSignOut={signOut} />
          )}
        </div>
      </header>
      <main className="centre">
        {token === null ? (
          <TokenScreen onSignedIn={signIn} />
        ) : (
          <HomeScreen key={token} token={token} onUnauthorized={signOut} />
        )}
      </main>
    </div>
  )
}

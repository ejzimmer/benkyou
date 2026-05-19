import { Navigate, Route, Routes } from "react-router-dom"
import { DeckListPage } from "./features/decks/DeckListPage"
import { DeckPage } from "./features/decks/DeckPage"
import { CardEditPage } from "./features/cards/CardEditPage"
import { ReviewSessionPage } from "./features/review/ReviewSessionPage"
import { SettingsPage } from "./features/settings/SettingsPage"
import { useAuth } from "./lib/auth/AuthContext"
import { useSync } from "./lib/sync/SyncContext"
import { useEffect, useRef } from "react"

export function App() {
  const { user, offlineOnly, loading } = useAuth()
  const { syncNow } = useSync()
  const syncedUidRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      syncedUidRef.current = null
      return
    }
    if (offlineOnly) return
    if (syncedUidRef.current === user.uid) return
    syncedUidRef.current = user.uid
    void syncNow()
  }, [offlineOnly, user, syncNow])

  useEffect(() => {
    if (!user || offlineOnly) return
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [offlineOnly, user, syncNow])

  if (loading) {
    return (
      <div className="page centred">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<DeckListPage />} />
        <Route path="/decks/:deckId" element={<DeckPage />} />
        <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
        <Route path="/decks/:deckId/cards/:cardId" element={<CardEditPage />} />
        <Route path="/review" element={<ReviewSessionPage />} />
        <Route path="/decks/:deckId/review" element={<ReviewSessionPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

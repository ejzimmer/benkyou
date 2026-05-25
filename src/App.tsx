import { Navigate, Route, Routes } from "react-router-dom"
import { DeckListPage } from "./features/decks/DeckListPage"
import { DeckPage } from "./features/decks/DeckPage"
import { CardEditPage } from "./features/cards/CardEditPage"
import { ReviewSessionPage } from "./features/review/ReviewSessionPage"
import { SettingsPage } from "./features/settings/SettingsPage"
import { useAuth } from "./lib/auth/AuthContext"
import { useSync } from "./lib/sync/SyncContext"
import { createVisibilitySyncTrigger } from "./lib/sync/syncTrigger"
import { useEffect, useMemo, useRef } from "react"

export function App() {
  const { user, offlineOnly, loading } = useAuth()
  const { syncNow } = useSync()
  const syncedUidRef = useRef<string | null>(null)
  const tabWasHiddenRef = useRef(false)

  useEffect(() => {
    if (!user) {
      syncedUidRef.current = null
      return
    }
    if (offlineOnly) return
    if (syncedUidRef.current === user.uid) return
    syncedUidRef.current = user.uid
    void syncNow().catch(() => {})
  }, [offlineOnly, user, syncNow])

  const visibilityTrigger = useMemo(
    () =>
      createVisibilitySyncTrigger({
        syncNow: () => syncNow().catch(() => {}),
      }),
    [syncNow],
  )

  useEffect(() => {
    if (!user || offlineOnly) return
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        tabWasHiddenRef.current = true
        return
      }
      if (document.visibilityState === "visible" && tabWasHiddenRef.current) {
        tabWasHiddenRef.current = false
        void visibilityTrigger.onVisible()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [offlineOnly, user, visibilityTrigger])

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

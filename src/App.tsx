import { Navigate, Route, Routes } from "react-router-dom"
import { DeckListPage } from "./features/decks/DeckListPage"
import { DeckPage } from "./features/decks/DeckPage"
import { CardEditPage } from "./features/cards/CardEditPage"
import { ReviewSessionPage } from "./features/review/ReviewSessionPage"
import { SettingsPage } from "./features/settings/SettingsPage"
import { useAuth } from "./lib/auth/AuthContext"
import { useSync } from "./lib/sync/SyncContext"
import { useEffect } from "react"

export function App() {
  const { user, offlineOnly, loading } = useAuth()
  const { syncNow } = useSync()

  useEffect(() => {
    if (!offlineOnly && user) void syncNow()
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

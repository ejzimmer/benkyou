import { Navigate, Route, Routes } from "react-router-dom"
import { DeckListPage } from "./features/decks/DeckListPage"
import { DeckPage } from "./features/decks/DeckPage"
import { CardEditPage } from "./features/cards/CardEditPage"
import { ReviewSessionPage } from "./features/review/ReviewSessionPage"
import { SettingsPage } from "./features/settings/SettingsPage"
import { useAuth } from "./lib/auth/AuthContext"
import { useEffect } from "react"
import { SyncIndicator } from "./ui/SyncIndicator"
import { SyncEditsButton } from "./ui/SyncEditsButton"

export function App() {
  const { loading } = useAuth()

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const syncViewportHeight = () => {
      document.documentElement.style.setProperty("--vvh", `${vv.height}px`)
    }
    syncViewportHeight()
    vv.addEventListener("resize", syncViewportHeight)
    vv.addEventListener("scroll", syncViewportHeight)
    return () => {
      vv.removeEventListener("resize", syncViewportHeight)
      vv.removeEventListener("scroll", syncViewportHeight)
      document.documentElement.style.removeProperty("--vvh")
    }
  }, [])

  if (loading) {
    return (
      <div className="page centred">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <SyncIndicator className="sync-indicator-global" />
      <SyncEditsButton />
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

import { Navigate, Route, Routes } from "react-router-dom"
import { CollectionPage } from "./features/collection/CollectionPage"
import { NewCardRedirect } from "./features/collection/NewCardRedirect"
import { DeckPage } from "./features/decks/DeckPage"
import { CardEditPage } from "./features/cards/CardEditPage"
import { ReviewSessionPage } from "./features/review/ReviewSessionPage"
import { useAuth } from "./lib/auth/AuthContext"
import { useEffect } from "react"

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
        <p>読み込み中</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<CollectionPage />} />
        <Route path="/cards/new" element={<NewCardRedirect />} />
        <Route path="/decks/:deckId" element={<DeckPage />} />
        <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
        <Route path="/decks/:deckId/cards/:cardId" element={<CardEditPage />} />
        <Route path="/review" element={<ReviewSessionPage />} />
        <Route path="/decks/:deckId/review" element={<ReviewSessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

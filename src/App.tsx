import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { CollectionPage } from "./features/collection/CollectionPage"
import { NewCardRedirect } from "./features/collection/NewCardRedirect"
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
        <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
        <Route path="/decks/:deckId/cards/:cardId" element={<CardEditPage />} />
        <Route path="/review" element={<ReviewSessionPage />} />
        <Route path="/decks/:deckId/review" element={<LegacyDeckReviewRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

/** Old deck-scoped review links (e.g. a card-edit tab's `returnTo` from
 *  before decks were hidden) go to the whole-collection review, keeping any
 *  resume state in the query string. */
function LegacyDeckReviewRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/review${search}`} replace />
}

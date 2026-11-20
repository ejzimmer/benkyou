import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { CardEditPage } from "../cards/CardEditPage"
import { CollectionPage } from "../collection/CollectionPage"
import { NewCardRedirect } from "../collection/NewCardRedirect"
import { ReviewSessionPage } from "../review/ReviewSessionPage"

export function CardsTab() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/cards" element={<CollectionPage />} />
        <Route path="/cards/new" element={<NewCardRedirect />} />
        <Route path="/decks/:deckId/cards/new" element={<CardEditPage />} />
        <Route path="/decks/:deckId/cards/:cardId" element={<CardEditPage />} />
        <Route path="/review" element={<ReviewSessionPage />} />
        <Route path="/decks/:deckId/review" element={<LegacyDeckReviewRedirect />} />
        <Route path="*" element={<Navigate to="/cards" replace />} />
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

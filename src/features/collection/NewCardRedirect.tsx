import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { getOrCreateDefaultDeck } from "../../services/decks"

/**
 * `/cards/new`: the single-collection home page's add button. Cards still
 * belong to a deck under the hood, so this resolves the default deck and
 * hands off to the existing add form, returning to the collection on back.
 */
export function NewCardRedirect() {
  const [deckId, setDeckId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getOrCreateDefaultDeck()
      .then((deck) => {
        if (!cancelled) setDeckId(deck.id)
      })
      .catch((x) => {
        if (!cancelled) setErr(x instanceof Error ? x.message : "エラーが発生しました。")
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (err) return <p className="error">{err}</p>
  if (!deckId) return <div className="page">読み込み中</div>
  return (
    <Navigate
      to={`/decks/${deckId}/cards/new?returnTo=${encodeURIComponent("/")}`}
      replace
    />
  )
}

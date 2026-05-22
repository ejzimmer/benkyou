import { useLiveQuery } from "dexie-react-hooks"
import { Link, useNavigate, useParams } from "react-router-dom"
import { db } from "../../lib/db/schema"
import { deleteDeck } from "../../services/decks"
import { useAuth } from "../../lib/auth/AuthContext"
import { useMemo, useState } from "react"

export function DeckPage() {
  const { deckId = "" } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const deck = useLiveQuery(() => db.decks.get(deckId), [deckId])
  const cards = useLiveQuery(
    () => db.cards.where("deckId").equals(deckId).toArray(),
    [deckId],
  )
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const list = cards ?? []
    if (!q.trim()) return list
    const n = q.toLowerCase()
    return list.filter((c) => {
      if (c.kind === "vocabulary") {
        return (
          c.content.wordJa.includes(q) ||
          c.content.definitionsEn.some((d) => d.toLowerCase().includes(n))
        )
      }
      return (
        c.content.sentenceWithGap.includes(q) ||
        c.content.translationEn.toLowerCase().includes(n)
      )
    })
  }, [cards, q])

  async function onDeleteDeck() {
    if (!confirm("Delete this deck and all its cards?")) return
    await deleteDeck(deckId, user)
    navigate("/")
  }

  if (deck === undefined) return <div className="page">Loading…</div>
  if (deck === null) return <div className="page">Deck not found.</div>

  return (
    <div className="page">
      <header className="header">
        <Link to="/">← Decks</Link>
        <h1>{deck.name}</h1>
      </header>

      <div className="toolbar">
        <Link to={`/decks/${deckId}/cards/new?vocab=1`} className="btn primary">
          Add vocabulary
        </Link>
        <Link to={`/decks/${deckId}/cards/new?vocab=0`} className="btn primary">
          Add grammar
        </Link>
        <Link to={`/decks/${deckId}/review`} className="btn">
          Review this deck
        </Link>
        <button type="button" className="btn danger" onClick={onDeleteDeck}>
          Delete deck
        </button>
      </div>

      <section className="panel">
        <h2>Cards</h2>
        <input
          className="input"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="card-list">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link to={`/decks/${deckId}/cards/${c.id}`}>
                {c.kind === "vocabulary"
                  ? c.content.wordJa
                  : c.content.sentenceWithGap}
              </Link>
              <span className="muted small">{c.kind}</span>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="muted">No matching cards.</p>}
      </section>
    </div>
  )
}

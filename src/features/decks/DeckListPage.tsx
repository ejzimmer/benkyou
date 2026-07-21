import { Link, useNavigate } from "react-router-dom"
import { db } from "../../lib/db/schema"
import { createDeck } from "../../services/decks"
import { getDueCountsByDeck } from "../../services/review"
import { useState } from "react"
import { useDebouncedQuery } from "../../lib/useDebouncedQuery"
import { AppIcon } from "../../ui/AppIcon"
import { UserMenu } from "../../ui/UserMenu"

export function DeckListPage() {
  const navigate = useNavigate()
  const decks = useDebouncedQuery(
    () => db.decks.orderBy("updatedAt").reverse().toArray(),
    [],
  )
  const dueCounts = useDebouncedQuery(() => getDueCountsByDeck(), [])
  const totalDue = dueCounts ? [...dueCounts.values()].reduce((sum, n) => sum + n, 0) : 0
  const [name, setName] = useState("")
  const [err, setErr] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setErr("Deck name can't be empty")
      return
    }
    setErr(null)
    try {
      const deck = await createDeck(trimmed)
      setName("")
      navigate(`/decks/${deck.id}`)
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed")
    }
  }

  return (
    <div className="page">
      <header className="header app-header">
        <Link to="/" className="brand" aria-label="Benkyou home">
          <AppIcon className="brand-icon" />
          <span className="brand-name">Benkyou</span>
        </Link>
        <div className="header-actions">
          <UserMenu />
        </div>
      </header>

      <section className="panel">
        <ul className="deck-list">
          {(decks ?? []).map((d) => {
            const due = dueCounts?.get(d.id) ?? 0
            return (
              <li key={d.id}>
                <Link to={`/decks/${d.id}`}>{d.name}</Link>
                <span className="deck-list-actions">
                  {due > 0 ? (
                    <span className="muted small">{due} due</span>
                  ) : (
                    <span className="due-complete" title="No reviews due" aria-label="No reviews due">
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="var(--green)" />
                        <path
                          d="M4.5 8.4l2.2 2.2 4.8-4.8"
                          fill="none"
                          stroke="var(--on-fluoro)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                  <Link
                    to={`/decks/${d.id}/cards/new`}
                    className="btn secondary icon add-card-btn"
                    aria-label={`Add card to ${d.name}`}
                    title="Add card"
                  >
                    +
                  </Link>
                </span>
              </li>
            )
          })}
        </ul>
        {(decks?.length ?? 0) === 0 && <p className="muted">No decks yet.</p>}
        {err && <p className="error">{err}</p>}
        <form onSubmit={onCreate} className="row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="New deck name"
            className="input"
          />
          <button type="submit" className="btn secondary add-deck-btn">
            デッキを作る
          </button>
        </form>
      </section>

      <nav className="footer-nav">
        {totalDue > 0 ? (
          <Link to="/review" className="btn primary">
            Review {totalDue} due
          </Link>
        ) : (
          <span className="muted">No reviews currently due</span>
        )}
      </nav>
    </div>
  )
}

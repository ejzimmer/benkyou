import { useLiveQuery } from "dexie-react-hooks"
import { Link, useNavigate } from "react-router-dom"
import { db } from "../../lib/db/schema"
import { createDeck } from "../../services/decks"
import { getDueCountsByDeck } from "../../services/review"
import { useAuth } from "../../lib/auth/AuthContext"
import { useState } from "react"
import { AppIcon } from "../../ui/AppIcon"
import { UserMenu } from "../../ui/UserMenu"

export function DeckListPage() {
  const navigate = useNavigate()
  const decks = useLiveQuery(() => db.decks.orderBy("updatedAt").reverse().toArray(), [])
  const dueCounts = useLiveQuery(() => getDueCountsByDeck(), [])
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [err, setErr] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      const deck = await createDeck(name.trim() || "New deck", user)
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
        <UserMenu />
      </header>

      <section className="panel">
        <ul className="deck-list">
          {(decks ?? []).map((d) => {
            const due = dueCounts?.get(d.id) ?? 0
            return (
              <li key={d.id}>
                <Link to={`/decks/${d.id}`}>{d.name}</Link>
                <span className="muted small">{due} due</span>
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
            placeholder="New deck name"
            className="input"
          />
          <button type="submit" className="btn">
            Add deck
          </button>
        </form>
      </section>

      <nav className="footer-nav">
        <Link to="/review" className="btn primary">
          Review all due
        </Link>
      </nav>
    </div>
  )
}

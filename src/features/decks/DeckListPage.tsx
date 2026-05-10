import { useLiveQuery } from "dexie-react-hooks"
import { Link, useNavigate } from "react-router-dom"
import { db } from "../../lib/db/schema"
import { createDeck } from "../../services/decks"
import { useAuth } from "../../lib/auth/AuthContext"
import { useState } from "react"

export function DeckListPage() {
  const navigate = useNavigate()
  const decks = useLiveQuery(() => db.decks.orderBy("updatedAt").reverse().toArray(), [])
  const { user, offlineOnly } = useAuth()
  const [name, setName] = useState("")
  const [err, setErr] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      const deck = await createDeck(name.trim() || "New deck")
      setName("")
      navigate(`/decks/${deck.id}`)
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed")
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Benkyou</h1>
        <p className="muted">
          Japanese SRS — local-first{offlineOnly ? " (offline-only)" : ""}
          {user ? ` · ${user.email ?? user.uid}` : ""}
        </p>
      </header>

      <section className="panel">
        <h2>Decks</h2>
        <form onSubmit={onCreate} className="row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New deck name"
            className="input"
          />
          <button type="submit" className="btn primary">
            Create
          </button>
        </form>
        {err && <p className="error">{err}</p>}
        <ul className="deck-list">
          {(decks ?? []).map((d) => (
            <li key={d.id}>
              <Link to={`/decks/${d.id}`}>{d.name}</Link>
            </li>
          ))}
        </ul>
        {(decks?.length ?? 0) === 0 && <p className="muted">No decks yet.</p>}
      </section>

      <nav className="footer-nav">
        <Link to="/review">Review all due</Link>
        <Link to="/settings">Settings</Link>
      </nav>
    </div>
  )
}

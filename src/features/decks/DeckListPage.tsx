import { Link, useNavigate } from "react-router-dom"
import { db } from "../../lib/db/schema"
import { createDeck } from "../../services/decks"
import { getDueCountsByDeck } from "../../services/review"
import { useMemo, useState } from "react"
import { cardMatchesQuery } from "../../domain/cardSearch"
import { SearchIcon } from "../../ui/SearchIcon"
import { useDebouncedQuery } from "../../lib/useDebouncedQuery"
import { useAuth } from "../../lib/auth/AuthContext"
import { AppIcon } from "../../ui/AppIcon"
import { UserMenu } from "../../ui/UserMenu"
import { SyncButton } from "../../ui/SyncButton"
import { BUILD_LABEL_LOCAL } from "../../lib/buildInfo"

export function DeckListPage() {
  const navigate = useNavigate()
  const { user, offlineOnly, signInGoogle } = useAuth()
  const decks = useDebouncedQuery(
    () => db.decks.orderBy("updatedAt").reverse().toArray(),
    [],
  )
  const dueCounts = useDebouncedQuery(() => getDueCountsByDeck(), [])
  const totalDue = dueCounts ? [...dueCounts.values()].reduce((sum, n) => sum + n, 0) : 0
  const [name, setName] = useState("")
  const [q, setQ] = useState("")
  const searching = q.trim() !== ""
  // Only loads every card while a search is actually typed, so the deck list
  // itself doesn't pay for a full card scan on every visit. `null` until a
  // search has loaded them, so the empty message doesn't flash meanwhile.
  const allCards = useDebouncedQuery(
    () => (searching ? db.cards.toArray() : Promise.resolve(null)),
    [searching],
  )
  const deckNames = useMemo(
    () => new Map((decks ?? []).map((d) => [d.id, d.name])),
    [decks],
  )
  const results = useMemo(
    () => (searching ? (allCards ?? []).filter((c) => cardMatchesQuery(c, q)) : []),
    [allCards, q, searching],
  )
  const [err, setErr] = useState<string | null>(null)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setErr("デッキ名を入力してください。")
      return
    }
    setErr(null)
    try {
      const deck = await createDeck(trimmed)
      setName("")
      navigate(`/decks/${deck.id}`)
    } catch (x) {
      setErr(x instanceof Error ? x.message : "エラーが発生しました。")
    }
  }

  const needsSignIn = !offlineOnly && !user

  return (
    <div className="page">
      <header className="header app-header">
        <Link to="/" className="brand" aria-label="Benkyouのホームへ">
          <AppIcon className="brand-icon" />
          <span className="brand-name">Benkyou</span>
        </Link>
        <div className="header-actions">
          <UserMenu />
          <SyncButton />
        </div>
      </header>

      {needsSignIn ? (
        <section className="centred">
          <button type="button" className="btn primary" onClick={signInGoogle}>
            Googleでサインイン
          </button>
        </section>
      ) : (
        <>
          <div className="toolbar deck-list-toolbar">
            <div className="deck-search">
              <SearchIcon className="deck-search-icon" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="すべてのデッキからカードを探す"
                title="すべてのデッキからカードを探す"
                className="input"
              />
            </div>
            <form onSubmit={onCreate} className="row deck-create">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setErr(null)
                }}
                aria-label="新しいデッキの名前"
                className="input"
              />
              <button type="submit" className="btn secondary add-deck-btn">
                デッキを作る
              </button>
            </form>
          </div>
          {err && <p className="error">{err}</p>}

          <section className="panel">
            {searching ? (
              <>
                <ul className="card-list deck-search-results">
                  {results.map((c) => (
                    <li key={c.id}>
                      <Link to={`/decks/${c.deckId}/cards/${encodeURIComponent(c.id)}`}>
                        {c.kind === "vocabulary" ? c.content.wordJa : c.content.sentenceWithGap}
                      </Link>
                      <Link to={`/decks/${c.deckId}`} className="muted small">
                        {deckNames.get(c.deckId) ?? ""}
                      </Link>
                    </li>
                  ))}
                </ul>
                {allCards && results.length === 0 && (
                  <p className="muted">カードが見つかりません。</p>
                )}
              </>
            ) : (
              <>
                <ul className="deck-list">
                  {(decks ?? []).map((d) => {
                    const due = dueCounts?.get(d.id) ?? 0
                    return (
                      <li key={d.id}>
                        <Link to={`/decks/${d.id}`}>{d.name}</Link>
                        <span className="deck-list-actions">
                          {due > 0 ? (
                            <span className="muted small">{due}枚</span>
                          ) : (
                            <span className="due-complete" title="復習するカードはありません" aria-label="復習するカードはありません">
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
                            aria-label={`${d.name}にカードを追加`}
                            title="カードを追加"
                          >
                            +
                          </Link>
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {(decks?.length ?? 0) === 0 && <p className="muted">デッキがありません。</p>}
              </>
            )}
          </section>

          <nav className="footer-nav">
            {totalDue > 0 ? (
              <Link to="/review" className="btn primary">
                {totalDue}枚を復習する
              </Link>
            ) : (
              <span className="muted">復習するカードはありません</span>
            )}
          </nav>
        </>
      )}

      <footer className="build-footer">
        <p className="muted small">{BUILD_LABEL_LOCAL}</p>
      </footer>
    </div>
  )
}

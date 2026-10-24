import { Link } from "react-router-dom"
import { useMemo, useState } from "react"
import { db, type SchedulingRow } from "../../lib/db/schema"
import { getDueCount } from "../../services/review"
import { clearLeech, unsuspendCard } from "../../services/cards"
import { isSuspendedDue } from "../../lib/srs/schedule"
import { cardMatchesQuery } from "../../domain/cardSearch"
import { useDebouncedQuery } from "../../lib/useDebouncedQuery"
import { useAuth } from "../../lib/auth/AuthContext"
import { AppIcon } from "../../ui/AppIcon"
import { UserMenu } from "../../ui/UserMenu"
import { SyncButton } from "../../ui/SyncButton"
import { SearchIcon } from "../../ui/SearchIcon"
import { SrsStageDiagram } from "../../ui/SrsStageDiagram"
import { NextReviewBar } from "../../ui/NextReviewBar"
import { LeechBadge } from "../../ui/LeechBadge"
import { BUILD_LABEL_LOCAL } from "../../lib/buildInfo"

/** Home page: every card in one collection, shown on a scrolling reel. */
export function CollectionPage() {
  const { user, offlineOnly, signInGoogle } = useAuth()
  const cards = useDebouncedQuery(
    () => db.cards.orderBy("updatedAt").reverse().toArray(),
    [],
  )
  const schedulingRows = useDebouncedQuery(() => db.scheduling.toArray(), [])
  const dueCount = useDebouncedQuery(() => getDueCount(), []) ?? 0
  const [q, setQ] = useState("")

  /** Soonest-due scheduling row per card — the one that determines when it next surfaces for review. */
  const nextScheduleByCard = useMemo(() => {
    const map = new Map<string, SchedulingRow>()
    for (const row of schedulingRows ?? []) {
      const current = map.get(row.cardId)
      if (!current || row.due < current.due) map.set(row.cardId, row)
    }
    return map
  }, [schedulingRows])

  /** Cards with at least one review mode flagged as a leech — a card can have
   *  several modes, and the leeched one isn't necessarily the soonest-due row. */
  const leechCardIds = useMemo(() => {
    const ids = new Set<string>()
    for (const row of schedulingRows ?? []) {
      if (row.isLeech) ids.add(row.cardId)
    }
    return ids
  }, [schedulingRows])

  const filtered = useMemo(() => {
    const list = cards ?? []
    if (!q.trim()) return list
    return list.filter((c) => cardMatchesQuery(c, q))
  }, [cards, q])

  const needsSignIn = !offlineOnly && !user

  return (
    <div className="page collection">
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
          <div className="collection-actions">
            {dueCount > 0 ? (
              <Link to="/review" className="btn primary">
                {dueCount}枚を復習する
              </Link>
            ) : (
              <button type="button" className="btn primary" disabled>
                復習するカードはありません
              </button>
            )}
            <Link to="/cards/new" className="btn primary blue">
              カードを作る
            </Link>
          </div>

          <div className="reel-machine">
            <div className="reel-topbar">
              <div className="deck-search">
                <SearchIcon className="deck-search-icon" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="カードを探す"
                  title="カードを探す"
                  className="input"
                />
              </div>
              <span className="reel-counter muted small">{filtered.length}枚</span>
            </div>

            <div className="reel-window">
              <ul className="card-list reel">
                {filtered.map((c) => {
                  const schedule = nextScheduleByCard.get(c.id)
                  return (
                    <li key={c.id}>
                      <Link
                        to={`/decks/${c.deckId}/cards/${encodeURIComponent(c.id)}?returnTo=${encodeURIComponent("/")}`}
                      >
                        {c.kind === "vocabulary"
                          ? c.content.wordJa
                          : c.content.sentenceWithGap}
                      </Link>
                      {leechCardIds.has(c.id) && (
                        <LeechBadge onClear={() => clearLeech(c.id).catch(console.error)} />
                      )}
                      <span className="card-schedule">
                        {schedule ? (
                          <>
                            <SrsStageDiagram state={schedule.fsrs.state} />
                            {isSuspendedDue(schedule.due) ? (
                              <button
                                type="button"
                                className="btn secondary unsuspend-btn"
                                title="このカードの復習を再開"
                                aria-label="このカードの復習を再開"
                                onClick={() => unsuspendCard(c.id).catch(console.error)}
                              >
                                再開
                              </button>
                            ) : (
                              <NextReviewBar due={schedule.due} />
                            )}
                          </>
                        ) : (
                          <span className="muted small">—</span>
                        )}
                      </span>
                    </li>
                  )
                })}
                {cards && filtered.length === 0 && (
                  <li className="reel-empty muted">
                    {q.trim() ? "カードが見つかりません。" : "カードがありません。"}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}

      <footer className="build-footer">
        <p className="muted small">{BUILD_LABEL_LOCAL}</p>
      </footer>
    </div>
  )
}

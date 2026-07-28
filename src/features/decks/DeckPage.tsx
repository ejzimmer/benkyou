import { useLiveQuery } from "dexie-react-hooks"
import { Link, useNavigate, useParams } from "react-router-dom"
import { db, type SchedulingRow } from "../../lib/db/schema"
import { deleteDeck } from "../../services/decks"
import { unsuspendCard } from "../../services/cards"
import { isSuspendedDue } from "../../lib/srs/schedule"
import { useMemo, useState } from "react"
import { ConfirmModal } from "../../ui/ConfirmModal"
import { PageHeading } from "../../ui/PageHeading"
import { SrsStageDiagram } from "../../ui/SrsStageDiagram"
import { NextReviewBar } from "../../ui/NextReviewBar"
import { LeechBadge } from "../../ui/LeechBadge"
import { UserMenu } from "../../ui/UserMenu"
import { SyncButton } from "../../ui/SyncButton"

export function DeckPage() {
  const { deckId = "" } = useParams()
  const navigate = useNavigate()
  const deck = useLiveQuery(() => db.decks.get(deckId), [deckId])
  const cards = useLiveQuery(
    () => db.cards.where("deckId").equals(deckId).toArray(),
    [deckId],
  )
  const [q, setQ] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const schedulingRows = useLiveQuery(async () => {
    const cardIds = (cards ?? []).map((c) => c.id)
    if (cardIds.length === 0) return []
    return db.scheduling.where("cardId").anyOf(cardIds).toArray()
  }, [cards])

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

  const cardCount = cards?.length ?? 0

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

  function onDeleteDeck() {
    setConfirmingDelete(true)
  }

  function onConfirmDeleteDeck() {
    setConfirmingDelete(false)
    navigate("/")
    deleteDeck(deckId).catch(console.error)
  }

  if (deck === undefined) return <div className="page">読み込み中</div>
  if (deck === null) return <div className="page">Deck not found.</div>

  return (
    <div className="page">
      <header className="header app-header">
        <PageHeading backTo="/" backLabel="Back to decks">
          {deck.name}
        </PageHeading>
        <div className="header-actions">
          <UserMenu />
          <SyncButton />
        </div>
      </header>

      <div className="toolbar deck-toolbar">
        <span className="muted small toolbar-count">{cardCount}枚のカード</span>
        <Link to={`/decks/${deckId}/review`} className="btn secondary green">
          デッキを復習
        </Link>
        <button
          type="button"
          className="btn secondary pink"
          onClick={onDeleteDeck}
        >
          デッキを削除
        </button>
        <Link to={`/decks/${deckId}/cards/new`} className="btn primary blue">
          カードを作る
        </Link>
      </div>

      <section className="panel">
        <input
          className="input"
          placeholder="探す"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="card-list">
          {filtered.map((c) => {
            const schedule = nextScheduleByCard.get(c.id)
            return (
              <li key={c.id}>
                <Link
                  to={`/decks/${deckId}/cards/${encodeURIComponent(c.id)}`}
                >
                  {c.kind === "vocabulary"
                    ? c.content.wordJa
                    : c.content.sentenceWithGap}
                </Link>
                {leechCardIds.has(c.id) && <LeechBadge />}
                <span className="card-schedule">
                  {schedule ? (
                    <>
                      <SrsStageDiagram state={schedule.fsrs.state} />
                      {isSuspendedDue(schedule.due) ? (
                        <button
                          type="button"
                          className="btn secondary unsuspend-btn"
                          title="Resume reviewing this card"
                          aria-label="Resume reviewing this card"
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
        </ul>
        {filtered.length === 0 && <p className="muted">No matching cards.</p>}
      </section>

      {confirmingDelete && (
        <ConfirmModal
          message="Delete this deck and all its cards?"
          onConfirm={onConfirmDeleteDeck}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

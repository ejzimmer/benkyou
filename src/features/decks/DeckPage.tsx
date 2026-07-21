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
import { UserMenu } from "../../ui/UserMenu"

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

  if (deck === undefined) return <div className="page">Loading…</div>
  if (deck === null) return <div className="page">Deck not found.</div>

  return (
    <div className="page">
      <header className="header app-header">
        <PageHeading backTo="/" backLabel="Back to decks">
          {deck.name}
        </PageHeading>
        <div className="header-actions">
          <UserMenu />
        </div>
      </header>

      <div className="toolbar deck-toolbar">
        <span className="muted small toolbar-count">
          {cardCount} card{cardCount === 1 ? "" : "s"}
        </span>
        <Link to={`/decks/${deckId}/review`} className="btn secondary green">
          Review this deck
        </Link>
        <button
          type="button"
          className="btn secondary pink"
          onClick={onDeleteDeck}
        >
          Delete deck
        </button>
        <Link to={`/decks/${deckId}/cards/new`} className="btn primary blue">
          Add card
        </Link>
      </div>

      <section className="panel">
        <input
          className="input"
          placeholder="Search…"
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

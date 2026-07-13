import { useLiveQuery } from "dexie-react-hooks"
import { Link, useNavigate, useParams } from "react-router-dom"
import { db, type SchedulingRow } from "../../lib/db/schema"
import { deleteDeck } from "../../services/decks"
import { useAuth } from "../../lib/auth/AuthContext"
import { useMemo, useState } from "react"
import { ConfirmModal } from "../../ui/ConfirmModal"
import { PageHeading } from "../../ui/PageHeading"
import { SrsStageDiagram } from "../../ui/SrsStageDiagram"
import { NextReviewBar } from "../../ui/NextReviewBar"

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
    deleteDeck(deckId, user).catch(console.error)
  }

  if (deck === undefined) return <div className="page">Loading…</div>
  if (deck === null) return <div className="page">Deck not found.</div>

  return (
    <div className="page">
      <header className="header">
        <PageHeading backTo="/" backLabel="Back to decks">
          {deck.name}
        </PageHeading>
      </header>

      <div className="toolbar">
        <Link to={`/decks/${deckId}/cards/new`} className="btn primary blue">
          Add card
        </Link>
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
        <span className="muted small toolbar-count">
          {cardCount} card{cardCount === 1 ? "" : "s"}
        </span>
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
                      <NextReviewBar
                        due={schedule.due}
                        lastReview={schedule.fsrs.last_review}
                      />
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

import { Link } from "react-router-dom"
import { CARD_KIND_LABELS, type Card } from "../../domain/types"
import { japaneseWordForCard } from "../../domain/duplicates"

type Props = {
  matches: Card[]
  mergingId: string | null
  error: string | null
  onMerge: (match: Card) => void
  onClose: () => void
}

export function DuplicateCardsModal({
  matches,
  mergingId,
  error,
  onMerge,
  onClose,
}: Props) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="modal-panel panel" onClick={(e) => e.stopPropagation()}>
        <h2>Duplicate cards</h2>

        {matches.length === 0 ? (
          <p className="muted small">No other cards contain this word.</p>
        ) : (
          <>
            <p className="muted small">
              These cards contain this card&apos;s Japanese word. Merging
              concatenates matching fields onto this card — clean up the
              result afterwards.
            </p>
            <ul className="card-list">
              {matches.map((match) => (
                <li key={match.id}>
                  <Link
                    to={`/decks/${match.deckId}/cards/${encodeURIComponent(match.id)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {japaneseWordForCard(match)}{" "}
                    <span className="muted small">
                      ({CARD_KIND_LABELS[match.kind]})
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="btn"
                    disabled={mergingId === match.id}
                    onClick={() => onMerge(match)}
                  >
                    {mergingId === match.id ? "Merging…" : "Merge into this card"}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {error && <p className="error">{error}</p>}

        <div className="toolbar">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

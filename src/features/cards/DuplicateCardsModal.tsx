import { Link } from "react-router-dom"
import { CARD_KIND_LABELS, type Card } from "../../domain/types"
import { japaneseWordForCard } from "../../domain/duplicates"
import { useModalPanelRef } from "../../ui/useModalPanelRef"

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
  const panelRef = useModalPanelRef<HTMLDivElement>()
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="modal-panel panel duplicate-cards-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>重複カード</h2>

        {matches.length === 0 ? (
          <p className="muted small">この単語を含む他のカードはありません。</p>
        ) : (
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
                  className="btn secondary"
                  disabled={mergingId === match.id}
                  onClick={() => onMerge(match)}
                >
                  {mergingId === match.id ? "統合中…" : "統合"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error">{error}</p>}

        <div className="toolbar duplicate-cards-footer">
          <button
            type="button"
            className="btn secondary white"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

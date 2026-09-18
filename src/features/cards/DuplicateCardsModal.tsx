import { Link } from "react-router-dom"
import { CARD_KIND_LABELS, type Card } from "../../domain/types"
import { japaneseWordForCard } from "../../domain/duplicates"
import { useModalPanelRef } from "../../ui/useModalPanelRef"

type Props = {
  /** Candidates still treated as possible duplicates. */
  matches: Card[]
  /** Candidates the user has already confirmed aren't duplicates. */
  dismissed?: Card[]
  /** Merging needs the edit form's in-progress draft, so it's only offered
   *  where that draft exists — omit it (as the review screen does) and the
   *  merge button isn't rendered. */
  onMerge?: (match: Card) => void
  mergingId?: string | null
  error?: string | null
  onMarkNotDuplicate: (match: Card) => void
  onRestoreDuplicate: (match: Card) => void
  onClose: () => void
}

function cardLabel(card: Card) {
  return (
    <>
      {japaneseWordForCard(card)}{" "}
      <span className="muted small">({CARD_KIND_LABELS[card.kind]})</span>
    </>
  )
}

export function DuplicateCardsModal({
  matches,
  dismissed = [],
  onMerge,
  mergingId,
  error,
  onMarkNotDuplicate,
  onRestoreDuplicate,
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
          // With dismissals below, "there are no other cards" would be
          // plainly false — the dismissed list speaks for itself instead.
          dismissed.length === 0 && (
            <p className="muted small">重複の可能性があるカードはありません。</p>
          )
        ) : (
          <ul className="card-list">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  to={`/decks/${match.deckId}/cards/${encodeURIComponent(match.id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {cardLabel(match)}
                </Link>
                <div className="duplicate-card-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => onMarkNotDuplicate(match)}
                  >
                    重複ではない
                  </button>
                  {onMerge && (
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={mergingId === match.id}
                      onClick={() => onMerge(match)}
                    >
                      {mergingId === match.id ? "統合中…" : "統合"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {dismissed.length > 0 && (
          <section className="duplicate-cards-dismissed">
            <h3 className="muted small">重複ではないとマーク済み</h3>
            <ul className="card-list">
              {dismissed.map((match) => (
                <li key={match.id}>
                  <Link
                    to={`/decks/${match.deckId}/cards/${encodeURIComponent(match.id)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {cardLabel(match)}
                  </Link>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => onRestoreDuplicate(match)}
                  >
                    元に戻す
                  </button>
                </li>
              ))}
            </ul>
          </section>
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

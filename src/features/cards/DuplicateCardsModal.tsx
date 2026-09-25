import { useState } from "react"
import { Link } from "react-router-dom"
import { CARD_KIND_LABELS, type Card } from "../../domain/types"
import { japaneseWordForCard } from "../../domain/duplicates"
import { Switch } from "../../ui/Switch"
import { useModalPanelRef } from "../../ui/useModalPanelRef"

/** The user's answer for one candidate: the same word (merge it in), or a
 *  different one (stop reporting it). */
export type DuplicateVerdict = "same" | "different"

/** What saving the modal should do, worked out from the switches. */
export type DuplicateChanges = {
  /** Candidates to merge into the card. */
  merge: Card[]
  /** Candidates to mark as not duplicates. */
  markNotDuplicate: Card[]
}

type Props = {
  /** Candidates still treated as possible duplicates. */
  matches: Card[]
  /** Candidates the user has already confirmed aren't duplicates. */
  dismissed?: Card[]
  saving?: boolean
  error?: string | null
  /** Applies the changes; the caller closes the modal once they've landed. */
  onSave: (changes: DuplicateChanges) => void
  onClose: () => void
}

/**
 * Works out the writes behind a set of switch positions. Unanswered matches
 * are left alone, and a dismissed candidate switched to 同じ is merged — the
 * merge drops the pair's "not a duplicate" mark itself (see
 * `mergeNotDuplicateOf`), so it needs no separate unmarking.
 */
export function duplicateChanges(
  matches: Card[],
  dismissed: Card[],
  verdicts: Record<string, DuplicateVerdict | undefined>,
): DuplicateChanges {
  const changes: DuplicateChanges = { merge: [], markNotDuplicate: [] }
  for (const match of matches) {
    if (verdicts[match.id] === "same") changes.merge.push(match)
    if (verdicts[match.id] === "different") changes.markNotDuplicate.push(match)
  }
  for (const match of dismissed) {
    if (verdicts[match.id] === "same") changes.merge.push(match)
  }
  return changes
}

const VERDICT_OPTIONS = [
  { value: "same", label: "同じ" },
  { value: "different", label: "違う" },
] as const

export function DuplicateCardsModal({
  matches,
  dismissed = [],
  saving = false,
  error,
  onSave,
  onClose,
}: Props) {
  const panelRef = useModalPanelRef<HTMLDivElement>()
  // Only the rows the user has touched: a match with no entry is unanswered,
  // a dismissed candidate with no entry keeps its 違う.
  const [picked, setPicked] = useState<Record<string, DuplicateVerdict>>({})
  const verdictFor = (card: Card, isDismissed: boolean) =>
    picked[card.id] ?? (isDismissed ? "different" : null)

  const verdicts: Record<string, DuplicateVerdict | undefined> = {}
  for (const match of matches) verdicts[match.id] = verdictFor(match, false) ?? undefined
  for (const match of dismissed) verdicts[match.id] = verdictFor(match, true) ?? undefined
  const changes = duplicateChanges(matches, dismissed, verdicts)
  const hasChanges = changes.merge.length + changes.markNotDuplicate.length > 0

  const rows = [
    ...matches.map((card) => ({ card, isDismissed: false })),
    ...dismissed.map((card) => ({ card, isDismissed: true })),
  ]

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-cards-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="modal-panel panel duplicate-cards-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="duplicate-cards-title">重複カード</h2>

        {rows.length === 0 ? (
          <p className="muted small">重複の可能性があるカードはありません。</p>
        ) : (
          <ul className="card-list duplicate-card-list">
            {rows.map(({ card, isDismissed }) => {
              const word = japaneseWordForCard(card)
              return (
                <li key={card.id}>
                  <div className="duplicate-card-label">
                    <Link
                      to={`/decks/${card.deckId}/cards/${encodeURIComponent(card.id)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {word}
                    </Link>
                    <span className="muted small">{CARD_KIND_LABELS[card.kind]}</span>
                  </div>
                  <Switch
                    legend={`${word}は同じカードですか？`}
                    name={`duplicate-${card.id}`}
                    tone="orange"
                    value={verdictFor(card, isDismissed)}
                    disabled={saving}
                    onChange={(verdict) =>
                      setPicked((prev) => ({ ...prev, [card.id]: verdict }))
                    }
                    options={VERDICT_OPTIONS}
                  />
                </li>
              )
            })}
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
          {rows.length > 0 && (
            <button
              type="button"
              className="btn primary"
              disabled={!hasChanges || saving}
              onClick={() => onSave(changes)}
            >
              {saving ? "保存中…" : "保存"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

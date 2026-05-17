import { useMemo, useState } from "react"
import type { BulkImportPayload } from "../../lib/import/types"
import {
  collectImportGaps,
  countDiscardedGaps,
  isImportGapResolved,
  type GrammarGapDraft,
  type ImportGapDraft,
  type VocabularyGapDraft,
} from "../../lib/import/gaps"
import { PLACEHOLDER_DEFINITION } from "../../domain/vocabularyContent"
import type { Card } from "../../domain/types"
import { ImportGapCardPreview } from "./ImportGapCardPreview"

export type AnkiImportGapReviewProps = {
  payload: BulkImportPayload
  onCancel: () => void
  onConfirm: (drafts: Record<string, ImportGapDraft>) => void
  importing?: boolean
}

function draftFromCard(card: Card): ImportGapDraft {
  if (card.kind === "vocabulary") {
    const defs = card.content.definitionsEn.filter(
      (d) => d.trim() && d.trim() !== PLACEHOLDER_DEFINITION,
    )
    return {
      kind: "vocabulary",
      englishLines: defs.join("\n"),
      reading: card.content.reading ?? "",
    }
  }
  return {
    kind: "grammar",
    translationEn: card.content.translationEn.trim(),
  }
}

export function AnkiImportGapReview({
  payload,
  onCancel,
  onConfirm,
  importing = false,
}: AnkiImportGapReviewProps) {
  const gaps = useMemo(() => collectImportGaps(payload), [payload])
  const cardById = useMemo(
    () => new Map(payload.cards.map((c) => [c.id, c])),
    [payload],
  )
  const gapCardIds = useMemo(() => gaps.map((g) => g.cardId), [gaps])

  const [drafts, setDrafts] = useState<Record<string, ImportGapDraft>>(() => {
    const init: Record<string, ImportGapDraft> = {}
    for (const gap of gaps) {
      const card = cardById.get(gap.cardId)
      init[gap.cardId] = card ? draftFromCard(card) : { kind: "vocabulary", englishLines: "" }
    }
    return init
  })

  const discardedCount = countDiscardedGaps(gapCardIds, drafts)
  const importCount = payload.cards.length - discardedCount

  const allResolved = gaps.every((gap) => {
    const card = cardById.get(gap.cardId)
    if (!card) return false
    return isImportGapResolved(card, drafts[gap.cardId])
  })

  function updateVocabDraft(cardId: string, patch: Partial<VocabularyGapDraft>) {
    setDrafts((prev) => {
      const cur = prev[cardId]
      if (!cur || cur.kind !== "vocabulary") return prev
      return { ...prev, [cardId]: { ...cur, ...patch } }
    })
  }

  function updateGrammarDraft(cardId: string, patch: Partial<GrammarGapDraft>) {
    setDrafts((prev) => {
      const cur = prev[cardId]
      if (!cur || cur.kind !== "grammar") return prev
      return { ...prev, [cardId]: { ...cur, ...patch } }
    })
  }

  function toggleDiscard(cardId: string, discarded: boolean) {
    setDrafts((prev) => {
      const cur = prev[cardId]
      if (!cur) return prev
      return { ...prev, [cardId]: { ...cur, discarded } }
    })
  }

  return (
    <div className="stack">
      <p className="muted">
        {gaps.length} card{gaps.length === 1 ? "" : "s"} need more information
        before they can be added to “{payload.deck.name}”. Review what Anki
        provided, fill in what’s missing, or discard cards you do not want.
      </p>

      {gaps.map((gap) => {
        const draft = drafts[gap.cardId]!
        const card = cardById.get(gap.cardId)
        if (!card) return null
        const discarded = Boolean(draft.discarded)
        const resolved = isImportGapResolved(card, draft)
        const status = discarded ? "Discarded" : resolved ? "Ready" : "Needs input"

        return (
          <div
            key={gap.cardId}
            className={`panel stack import-gap-card${discarded ? " import-gap-card--discarded" : ""}`}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>
                <span className="muted small">
                  {gap.kind === "vocabulary" ? "Vocabulary" : "Grammar"}
                  {" · "}
                </span>
                {gap.title}
              </h3>
              <span
                className={
                  discarded ? "muted" : resolved ? "muted" : "warn"
                }
              >
                {status}
              </span>
            </div>

            {card && (
              <ImportGapCardPreview card={card} mediaItems={payload.media} />
            )}

            <label className="row import-gap-discard">
              <input
                type="checkbox"
                checked={discarded}
                disabled={importing}
                onChange={(e) => toggleDiscard(gap.cardId, e.target.checked)}
              />
              <span>Discard this card (do not import)</span>
            </label>

            {!discarded && (
              <div className="stack import-gap-fill">
                <p className="muted small" style={{ margin: 0 }}>
                  {gap.detail}
                </p>

                {gap.kind === "vocabulary" && draft.kind === "vocabulary" && (
                  <>
                    {gap.canFillReading && (
                      <label>
                        Pronunciation (hiragana)
                        <input
                          className="input"
                          value={draft.reading ?? ""}
                          disabled={importing}
                          onChange={(e) =>
                            updateVocabDraft(gap.cardId, {
                              reading: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    {gap.canFillEnglish && (
                      <label>
                        English meaning (one per line)
                        <textarea
                          className="input"
                          rows={2}
                          value={draft.englishLines ?? ""}
                          disabled={importing}
                          onChange={(e) =>
                            updateVocabDraft(gap.cardId, {
                              englishLines: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    {gap.canFillImage && (
                      <label>
                        Image
                        <input
                          type="file"
                          accept="image/*"
                          disabled={importing}
                          onChange={(e) =>
                            updateVocabDraft(gap.cardId, {
                              imageFiles: e.target.files
                                ? [...e.target.files]
                                : undefined,
                            })
                          }
                        />
                      </label>
                    )}
                  </>
                )}

                {gap.kind === "grammar" && draft.kind === "grammar" && (
                  <>
                    {gap.canFillEnglish && (
                      <label>
                        English translation
                        <textarea
                          className="input"
                          rows={2}
                          value={draft.translationEn ?? ""}
                          disabled={importing}
                          onChange={(e) =>
                            updateGrammarDraft(gap.cardId, {
                              translationEn: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    {gap.canFillImage && (
                      <label>
                        Image
                        <input
                          type="file"
                          accept="image/*"
                          disabled={importing}
                          onChange={(e) =>
                            updateGrammarDraft(gap.cardId, {
                              imageFiles: e.target.files
                                ? [...e.target.files]
                                : undefined,
                            })
                          }
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div className="toolbar">
        <button
          type="button"
          className="btn primary"
          disabled={!allResolved || importing || importCount === 0}
          onClick={() => onConfirm(drafts)}
        >
          {importing
            ? "Importing…"
            : `Import deck (${importCount} card${importCount === 1 ? "" : "s"})`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={importing}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      {importCount === 0 && (
        <p className="warn">
          All cards are discarded. Uncheck at least one card to import the deck.
        </p>
      )}
    </div>
  )
}

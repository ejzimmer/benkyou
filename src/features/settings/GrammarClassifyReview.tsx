import { useState } from "react"
import type {
  GrammarCandidate,
  GrammarDecision,
  GrammarDecisionMap,
} from "../../lib/import/types"

export type GrammarClassifyReviewProps = {
  candidates: GrammarCandidate[]
  deckName: string
  onCancel: () => void
  onConfirm: (decisions: GrammarDecisionMap) => void
  importing?: boolean
}

/**
 * A vocab card that merely includes an example sentence looks identical to a
 * grammar card, so before any grammar card is built we ask the user to confirm
 * each gap-marked note as grammar or vocab.
 */
export function GrammarClassifyReview({
  candidates,
  deckName,
  onCancel,
  onConfirm,
  importing = false,
}: GrammarClassifyReviewProps) {
  const [decisions, setDecisions] = useState<GrammarDecisionMap>(() => {
    const init: GrammarDecisionMap = {}
    // Default to "grammar" (the historical behaviour); the user flips the ones
    // that are really vocabulary.
    for (const candidate of candidates) init[candidate.key] = "grammar"
    return init
  })

  function setDecision(key: string, decision: GrammarDecision) {
    setDecisions((prev) => ({ ...prev, [key]: decision }))
  }

  const vocabCount = candidates.filter(
    (c) => decisions[c.key] === "vocab",
  ).length
  const grammarCount = candidates.length - vocabCount

  return (
    <div className="stack">
      <p className="muted">
        {candidates.length} card{candidates.length === 1 ? "" : "s"} in “
        {deckName}” look like grammar (they contain a blank). Confirm whether
        each is a grammar card or a vocabulary card that just includes an
        example sentence.
      </p>

      {candidates.map((candidate) => {
        const decision = decisions[candidate.key] ?? "grammar"
        return (
          <div key={candidate.key} className="panel stack">
            <p className="prompt-main" style={{ margin: 0 }}>
              {candidate.sentence || "(no sentence)"}
            </p>
            {candidate.construction && (
              <p className="muted small" style={{ margin: 0 }}>
                Answer: {candidate.construction}
              </p>
            )}
            {candidate.imageCount > 0 && (
              <p className="muted small" style={{ margin: 0 }}>
                {candidate.imageCount} image
                {candidate.imageCount === 1 ? "" : "s"}
              </p>
            )}
            <div className="row" style={{ gap: "1rem" }}>
              <label className="row">
                <input
                  type="radio"
                  name={`grammar-decision-${candidate.key}`}
                  checked={decision === "grammar"}
                  disabled={importing}
                  onChange={() => setDecision(candidate.key, "grammar")}
                />
                <span>Grammar</span>
              </label>
              <label className="row">
                <input
                  type="radio"
                  name={`grammar-decision-${candidate.key}`}
                  checked={decision === "vocab"}
                  disabled={importing}
                  onChange={() => setDecision(candidate.key, "vocab")}
                />
                <span>Vocabulary</span>
              </label>
            </div>
          </div>
        )
      })}

      <div className="toolbar">
        <button
          type="button"
          className="btn primary"
          disabled={importing}
          onClick={() => onConfirm(decisions)}
        >
          {importing
            ? "Importing…"
            : `Continue (${grammarCount} grammar, ${vocabCount} vocab)`}
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
    </div>
  )
}

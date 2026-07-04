import { useEffect, useRef } from "react"
import type { DueItem } from "../../services/review"
import { AnswerComparison } from "../../ui/AnswerComparison"
import { CardImageRow } from "../../ui/CardImageRow"
import {
  answersMatch,
  differsOnlyByPunctuation,
  readingForConstruction,
  requiresTyping,
} from "./reviewFlowHelpers"

export type ReviewSessionAnswerPanelProps = {
  item: DueItem
  typed: string
  expected: string
  pendingIncorrectDelay: boolean
  onJudge: (correct: boolean) => void
  onUndoAnswer: () => void
}

export function ReviewSessionAnswerPanel({
  item,
  typed,
  expected,
  pendingIncorrectDelay,
  onJudge,
  onUndoAnswer,
}: ReviewSessionAnswerPanelProps) {
  const { card, modeId: m } = item
  const typingMode = requiresTyping(m)
  const correctBtnRef = useRef<HTMLButtonElement>(null)
  const incorrectBtnRef = useRef<HTMLButtonElement>(null)
  const answeredCorrectly = answersMatch(m, typed, expected)

  useEffect(() => {
    if (pendingIncorrectDelay) return
    // Typed answers default focus to Correct when right (or only punctuation is
    // off); otherwise Incorrect. Oral answers always default to Correct.
    const focusCorrect =
      !typingMode ||
      answeredCorrectly ||
      differsOnlyByPunctuation(typed, expected)
    if (focusCorrect) {
      correctBtnRef.current?.focus({ preventScroll: true })
    } else {
      incorrectBtnRef.current?.focus({ preventScroll: true })
    }
  }, [typingMode, answeredCorrectly, pendingIncorrectDelay, typed, expected])

  const answerControls = (
    <div className="toolbar">
      <button
        ref={correctBtnRef}
        type="button"
        className="btn good"
        disabled={pendingIncorrectDelay}
        onClick={() => onJudge(true)}
      >
        Correct
      </button>
      <button
        ref={incorrectBtnRef}
        type="button"
        className="btn bad"
        disabled={pendingIncorrectDelay}
        onClick={() => onJudge(false)}
      >
        Incorrect
      </button>
      {typingMode && (
        <button
          type="button"
          className="btn"
          disabled={pendingIncorrectDelay}
          onClick={() => onUndoAnswer()}
        >
          Undo answer
        </button>
      )}
    </div>
  )

  return (
    <div className="answer-block stack">
      {m === "vocab_oral_en" && card.kind === "vocabulary" && (
        <>
          <ul>
            {card.content.definitionsEn
              .filter((s) => s.trim())
              .map((d, i) => (
                <li key={i}>{d}</li>
              ))}
          </ul>
          <CardImageRow images={card.content.images} />
        </>
      )}

      {m === "vocab_type_reading" && card.kind === "vocabulary" && (
        <AnswerComparison typed={typed} expected={expected} />
      )}

      {m === "vocab_type_word_from_clue" && card.kind === "vocabulary" && (
        <AnswerComparison
          typed={typed}
          expected={expected}
          reading={card.content.reading}
        />
      )}

      {m === "grammar_type_construction" && card.kind === "grammar" && (
        <AnswerComparison
          typed={typed}
          expected={expected}
          reading={readingForConstruction(
            card.content.construction,
            card.content.readings,
          )}
          answeredCorrectly={answeredCorrectly}
        />
      )}

      {m === "grammar_oral_meaning" && card.kind === "grammar" && (
        <>
          {card.content.translationEn.trim() && (
            <p>{card.content.translationEn}</p>
          )}
          <CardImageRow images={card.content.images} />
        </>
      )}

      {answerControls}
    </div>
  )
}

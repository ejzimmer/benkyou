import { useEffect, useRef } from "react"
import type { DueItem } from "../../services/review"
import { CardImage } from "../../ui/CardImage"
import { GapAnswerDiff } from "../../ui/GapAnswerDiff"
import { RubyWord } from "../../ui/KanjiRuby"
import { TextDiffCompare } from "../../ui/TextDiffCompare"
import { readingForConstruction, requiresTyping } from "./reviewFlowHelpers"

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

  useEffect(() => {
    if (pendingIncorrectDelay) return
    if (typingMode) {
      if (typed === expected) {
        correctBtnRef.current?.focus({ preventScroll: true })
      } else {
        incorrectBtnRef.current?.focus({ preventScroll: true })
      }
    } else {
      correctBtnRef.current?.focus({ preventScroll: true })
    }
  }, [typingMode, typed, expected, pendingIncorrectDelay])

  return (
    <div className="answer-block stack">
      {m !== "vocab_type_reading" && m !== "grammar_type_construction" && (
        <h3>Answer</h3>
      )}
      {typingMode &&
        m !== "vocab_type_reading" &&
        m !== "grammar_type_construction" && (
          <TextDiffCompare typed={typed} expected={expected} />
        )}
      {m === "vocab_oral_en" && card.kind === "vocabulary" && (
        <>
          <ul>
            {card.content.definitionsEn
              .filter((s) => s.trim())
              .map((d, i) => (
                <li key={i}>{d}</li>
              ))}
          </ul>
          {card.content.images.map((id) => (
            <CardImage key={id} mediaId={id} />
          ))}
        </>
      )}
      {m === "vocab_type_reading" && card.kind === "vocabulary" && (
        <>
          <div className="answer-grid" lang="ja">
            <span className="answer-grid-label">correct answer</span>
            <span className="answer-grid-value">{expected}</span>
            <span className="answer-grid-label">your answer</span>
            <span className="answer-grid-value">{typed || "—"}</span>
          </div>
          <details className="meaning-details">
            <summary className="btn">Show meaning</summary>
            <div className="meaning-details-content stack">
              {card.content.definitionsEn.filter((s) => s.trim()).length > 0 && (
                <ul>
                  {card.content.definitionsEn
                    .filter((s) => s.trim())
                    .map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                </ul>
              )}
              {card.content.exampleSentences
                .filter((s) => s.trim())
                .map((s, i) => (
                  <p key={i} className="muted">
                    {s}
                  </p>
                ))}
              {card.content.images.map((id) => (
                <CardImage key={id} mediaId={id} />
              ))}
            </div>
          </details>
        </>
      )}
      {m === "vocab_type_word_from_clue" && card.kind === "vocabulary" && (
        <p className="prompt-main">
          <RubyWord
            surface={card.content.wordJa}
            reading={card.content.reading}
          />
        </p>
      )}
      {m === "grammar_type_construction" && card.kind === "grammar" && (
        <GapAnswerDiff
          typed={typed}
          expected={expected}
          reading={readingForConstruction(
            card.content.construction,
            card.content.readings,
          )}
        />
      )}
      {m === "grammar_oral_meaning" && card.kind === "grammar" && (
        <>
          <p className="prompt-main">
            <RubyWord
              surface={card.content.construction}
              reading={readingForConstruction(
                card.content.construction,
                card.content.readings,
              )}
            />
          </p>
          {card.content.translationEn.trim() && (
            <p>{card.content.translationEn}</p>
          )}
          {card.content.images.map((id) => (
            <CardImage key={id} mediaId={id} />
          ))}
        </>
      )}
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
    </div>
  )
}

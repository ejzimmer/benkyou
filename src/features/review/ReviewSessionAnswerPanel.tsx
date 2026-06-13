import { diffChars } from "diff"
import { useEffect, useId, useRef } from "react"
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

type ReadingDiffCell = {
  value: string
  kind: "same" | "missing" | "extra" | "gap"
}

function buildAlignedReadingDiff(expected: string, typed: string) {
  const correct: ReadingDiffCell[] = []
  const yours: ReadingDiffCell[] = []

  for (const part of diffChars(expected, typed)) {
    for (const value of Array.from(part.value)) {
      if (part.removed) {
        correct.push({ value, kind: "missing" })
        yours.push({ value: "-", kind: "gap" })
      } else if (part.added) {
        correct.push({ value: "", kind: "gap" })
        yours.push({ value, kind: "extra" })
      } else {
        correct.push({ value, kind: "same" })
        yours.push({ value, kind: "same" })
      }
    }
  }

  return { correct, yours }
}

type ReadingDiffLineProps = {
  cells: ReadingDiffCell[]
  labelId: string
  line: "correct" | "yours"
}

function ReadingDiffLine({ cells, labelId, line }: ReadingDiffLineProps) {
  const columns = Math.max(cells.length, 1)

  return (
    <span
      className="answer-grid-value reading-answer-value reading-answer-diff-line"
      lang="ja"
      aria-labelledby={labelId}
      data-reading-diff-line={line}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(1.05em, max-content))`,
      }}
    >
      {cells.map((cell, index) => (
        <span
          key={`${line}-${index}`}
          className={`reading-answer-diff-cell reading-answer-diff-${cell.kind}`}
          aria-hidden={cell.kind === "gap" && cell.value === ""}
        >
          {cell.value}
        </span>
      ))}
    </span>
  )
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
  const correctAnswerLabelId = useId()
  const typedAnswerLabelId = useId()
  const answeredCorrectly = typed === expected
  const readingDiff = answeredCorrectly
    ? null
    : buildAlignedReadingDiff(expected, typed)

  useEffect(() => {
    if (pendingIncorrectDelay) return
    if (typingMode) {
      if (answeredCorrectly) {
        correctBtnRef.current?.focus({ preventScroll: true })
      } else {
        incorrectBtnRef.current?.focus({ preventScroll: true })
      }
    } else {
      correctBtnRef.current?.focus({ preventScroll: true })
    }
  }, [typingMode, answeredCorrectly, pendingIncorrectDelay])

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
          <div
            className="reading-answer-comparison"
            role="group"
            aria-label={
              answeredCorrectly
                ? "Hiragana answer"
                : "Hiragana answer comparison"
            }
          >
            <div className="reading-answer-row">
              <span id={correctAnswerLabelId} className="answer-grid-label">
                Correct answer
              </span>
              {readingDiff ? (
                <ReadingDiffLine
                  cells={readingDiff.correct}
                  labelId={correctAnswerLabelId}
                  line="correct"
                />
              ) : (
                <span
                  className="answer-grid-value reading-answer-value"
                  lang="ja"
                  aria-labelledby={correctAnswerLabelId}
                >
                  {expected || "—"}
                </span>
              )}
            </div>
            {!answeredCorrectly && (
              <div className="reading-answer-row">
                <span id={typedAnswerLabelId} className="answer-grid-label">
                  Your answer
                </span>
                {readingDiff ? (
                  <ReadingDiffLine
                    cells={readingDiff.yours}
                    labelId={typedAnswerLabelId}
                    line="yours"
                  />
                ) : (
                  <span
                    className="answer-grid-value reading-answer-value"
                    lang="ja"
                    aria-labelledby={typedAnswerLabelId}
                  >
                    {typed || "—"}
                  </span>
                )}
              </div>
            )}
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

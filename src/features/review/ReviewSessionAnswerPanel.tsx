import { diffChars } from "diff"
import { useEffect, useId, useRef } from "react"
import type { DueItem } from "../../services/review"
import { CardImageRow } from "../../ui/CardImageRow"
import { GapAnswerDiff } from "../../ui/GapAnswerDiff"
import { RubyWord } from "../../ui/KanjiRuby"
import { TextDiffCompare } from "../../ui/TextDiffCompare"
import {
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
        <div
          className="reading-answer-comparison"
          role="group"
          aria-label={
            answeredCorrectly ? "Hiragana answer" : "Hiragana answer comparison"
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
      )}

      {m === "vocab_type_word_from_clue" &&
        card.kind === "vocabulary" &&
        (answeredCorrectly ? (
          <p className="prompt-main">
            <RubyWord
              surface={card.content.wordJa}
              reading={card.content.reading}
            />
          </p>
        ) : (
          <TextDiffCompare
            typed={typed}
            expected={expected}
            expectedReading={card.content.reading}
          />
        ))}

      {m === "grammar_type_construction" &&
        card.kind === "grammar" &&
        (answeredCorrectly ? (
          <p className="prompt-main">
            <RubyWord
              surface={card.content.construction}
              reading={readingForConstruction(
                card.content.construction,
                card.content.readings,
              )}
            />
          </p>
        ) : (
          <GapAnswerDiff
            typed={typed}
            expected={expected}
            reading={readingForConstruction(
              card.content.construction,
              card.content.readings,
            )}
          />
        ))}

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

import { diffChars } from "diff"
import { useId } from "react"

export type AnswerComparisonProps = {
  /** What the user typed. */
  typed: string
  /** The correct answer. */
  expected: string
  /**
   * Hiragana reading for the correct answer. When the answer contains kanji,
   * the correct line shows furigana on hover/focus.
   */
  reading?: string
  /**
   * Override for whether `typed` counts as correct. Defaults to strict
   * equality — pass this when the caller's grading is more lenient (e.g.
   * comma vs 、 between a fill-in-the-gap card's per-gap answers).
   */
  answeredCorrectly?: boolean
}

type Cell = { value: string; kind: "same" | "missing" | "extra" | "gap" }

/**
 * Character-aligned diff: corresponding characters line up in the same column
 * across the two lines, with a gap placeholder where one side is missing.
 */
function buildAlignedDiff(expected: string, typed: string): {
  correct: Cell[]
  yours: Cell[]
} {
  const correct: Cell[] = []
  const yours: Cell[] = []
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

const KANJI = /[一-鿿]/

function DiffLine({
  cells,
  labelId,
  line,
}: {
  cells: Cell[]
  labelId: string
  line: "correct" | "yours"
}) {
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

/**
 * The single answer display used by every typed review mode. When correct it
 * shows just the correct answer; when incorrect it stacks the correct answer
 * over the user's answer at the same size, with character-aligned highlights
 * (missing in blue, extra in red, matches in green). The correct answer shows
 * furigana on hover when it contains kanji.
 */
export function AnswerComparison({
  typed,
  expected,
  reading,
  answeredCorrectly,
}: AnswerComparisonProps) {
  const correctId = useId()
  const yoursId = useId()
  const isCorrect = answeredCorrectly ?? typed === expected
  const showRuby = Boolean(reading?.trim()) && KANJI.test(expected)
  const diff = isCorrect ? null : buildAlignedDiff(expected, typed)

  const correctBody = diff ? (
    <DiffLine cells={diff.correct} labelId={correctId} line="correct" />
  ) : (
    <span
      className="answer-grid-value reading-answer-value"
      lang="ja"
      aria-labelledby={correctId}
    >
      {expected || "—"}
    </span>
  )

  return (
    <div
      className="reading-answer-comparison"
      role="group"
      aria-label={isCorrect ? "Answer" : "Answer comparison"}
    >
      <div className="reading-answer-row">
        <span id={correctId} className="answer-grid-label">
          Correct answer
        </span>
        {showRuby ? (
          <span className="ruby-hover answer-ruby" tabIndex={0}>
            <ruby>
              {correctBody}
              <rt>{reading}</rt>
            </ruby>
          </span>
        ) : (
          correctBody
        )}
      </div>
      {diff && (
        <div className="reading-answer-row">
          <span id={yoursId} className="answer-grid-label">
            Your answer
          </span>
          <DiffLine cells={diff.yours} labelId={yoursId} line="yours" />
        </div>
      )}
    </div>
  )
}

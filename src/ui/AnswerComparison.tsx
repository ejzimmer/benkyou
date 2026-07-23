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

/**
 * Furigana grouped by which diff cells it sits above. When the reading has
 * exactly one character per real (non-gap) cell — the common case for a
 * kanji+okurigana word — each cell gets its own character, so the
 * annotation tracks the diff's column alignment even when gap cells (from
 * extra typed characters) split the word into separate runs. Otherwise the
 * whole reading spans from the first to the last real cell, matching prior
 * behaviour.
 */
function furiganaGroups(cells: Cell[], reading: string | undefined) {
  const trimmed = reading?.trim()
  if (!trimmed) return []
  const realIndexes = cells.reduce<number[]>((acc, cell, index) => {
    if (cell.kind !== "gap") acc.push(index)
    return acc
  }, [])
  if (realIndexes.length === 0) return []
  if (trimmed.length === realIndexes.length) {
    return realIndexes.map((index, i) => ({
      start: index,
      end: index,
      text: trimmed[i]!,
    }))
  }
  return [
    {
      start: realIndexes[0]!,
      end: realIndexes[realIndexes.length - 1]!,
      text: trimmed,
    },
  ]
}

function DiffLine({
  cells,
  labelId,
  line,
  reading,
}: {
  cells: Cell[]
  labelId: string
  line: "correct" | "yours"
  reading?: string
}) {
  const descId = useId()
  const columns = Math.max(cells.length, 1)
  const groups = furiganaGroups(cells, reading)
  const hasFurigana = groups.length > 0
  return (
    <span
      className={
        "answer-grid-value reading-answer-value reading-answer-diff-line" +
        (hasFurigana ? " reading-answer-diff-line-has-furigana" : "")
      }
      lang="ja"
      aria-labelledby={labelId}
      aria-describedby={hasFurigana ? descId : undefined}
      data-reading-diff-line={line}
      tabIndex={hasFurigana ? 0 : undefined}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1.4em)`,
      }}
    >
      {hasFurigana && (
        <span id={descId} className="sr-only">
          {reading?.trim()}
        </span>
      )}
      {groups.map((group, i) => (
        <ruby
          key={`furigana-${i}`}
          className="reading-answer-diff-furigana"
          style={{
            gridColumn: `${group.start + 1} / ${group.end + 2}`,
            gridRow: 1,
          }}
        >
          <rt>{group.text}</rt>
        </ruby>
      ))}
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
  // Mirrors DiffLine's own hasFurigana check for the correct line: when it
  // reserves margin-top for a floating furigana annotation, the maru beside
  // it needs the same margin (see .answer-correct-row-has-furigana in
  // index.css) so align-items: center still centers on the kanji itself,
  // not on the kanji plus the reserved furigana space above it.
  const correctLineHasFurigana =
    diff !== null &&
    furiganaGroups(diff.correct, showRuby ? reading : undefined).length > 0

  const correctBody = diff ? (
    <DiffLine
      cells={diff.correct}
      labelId={correctId}
      line="correct"
      reading={showRuby ? reading : undefined}
    />
  ) : (
    <span
      className="answer-grid-value reading-answer-value"
      lang="ja"
      aria-labelledby={correctId}
    >
      {expected || "—"}
    </span>
  )

  const correctAnswer = showRuby && isCorrect ? (
    <span className="ruby-hover" tabIndex={0}>
      <ruby>
        {correctBody}
        <rt>{reading}</rt>
      </ruby>
    </span>
  ) : (
    correctBody
  )

  return (
    <div
      className="reading-answer-comparison"
      role="group"
      aria-label={isCorrect ? "Answer" : "Answer comparison"}
    >
      <div className="reading-answer-row">
        <span id={correctId} className="answer-grid-label sr-only">
          Correct answer
        </span>
        <span
          className={
            "answer-correct-row" +
            (correctLineHasFurigana ? " answer-correct-row-has-furigana" : "")
          }
        >
          {correctAnswer}
          <span className="maru-mark" aria-hidden="true" />
          {isCorrect && <span className="sr-only">Correct</span>}
        </span>
      </div>
      {diff && (
        <div className="reading-answer-row">
          <span id={yoursId} className="answer-grid-label sr-only">
            Your answer
          </span>
          <span className="answer-incorrect-row">
            <DiffLine cells={diff.yours} labelId={yoursId} line="yours" />
            <span className="cross-mark" aria-hidden="true" />
            <span className="sr-only">Incorrect</span>
          </span>
        </div>
      )}
    </div>
  )
}

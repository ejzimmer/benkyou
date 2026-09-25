import { diffChars } from "diff"
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react"
import {
  furiganaSegments,
  joinSegmentReadings,
  type ReadingSegment,
} from "../domain/readingsMap"

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
   * Kanji phrase → reading map for `expected` (e.g. a card's furigana
   * `readings` field). Every entry that matches is shown as furigana over
   * its own cluster (matching how the same map renders elsewhere, e.g.
   * `RubySegment`), in preference to `reading` being shown as a single span
   * over the whole answer. `reading` is used only when the map annotates
   * nothing here.
   */
  readings?: Record<string, string>
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
 * Furigana grouped by which diff cells it sits above.
 *
 * When `segments` is given (a phrase fully broken down by a readings map),
 * each segment gets its own group spanning just its own cells — so e.g.
 * 緩やかな風 with 緩=ゆる/風=かぜ shows "ゆる" over 緩 and "かぜ" over 風
 * rather than the whole reading spanning the entire phrase.
 *
 * Otherwise, when the flat `reading` has exactly one character per real
 * (non-gap) cell — the common case for a kanji+okurigana word — each cell
 * gets its own character, so the annotation tracks the diff's column
 * alignment even when gap cells (from extra typed characters) split the word
 * into separate runs. Otherwise the whole reading spans from the first to
 * the last real cell.
 */
function furiganaGroups(
  cells: Cell[],
  reading: string | undefined,
  segments?: ReadingSegment[],
): FuriganaGroup[] {
  const realIndexes = cells.reduce<number[]>((acc, cell, index) => {
    if (cell.kind !== "gap") acc.push(index)
    return acc
  }, [])
  if (realIndexes.length === 0) return []

  if (segments) {
    const groups: FuriganaGroup[] = []
    let pos = 0
    for (const segment of segments) {
      const segReading = segment.reading?.trim()
      if (segReading) {
        const start = realIndexes[pos]
        const end = realIndexes[pos + segment.text.length - 1]
        if (start !== undefined && end !== undefined) {
          groups.push({ start, end, text: segReading })
        }
      }
      pos += segment.text.length
    }
    return groups
  }

  const trimmed = reading?.trim()
  if (!trimmed) return []
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

type FuriganaGroup = { start: number; end: number; text: string }

function DiffLine({
  cells,
  labelId,
  line,
  groups = [],
  description,
}: {
  cells: Cell[]
  labelId: string
  line: "correct" | "yours"
  /** Furigana for this line, as column ranges within `cells`. */
  groups?: FuriganaGroup[]
  /** Whole-answer reading, announced to screen readers. */
  description?: string
}) {
  const descId = useId()
  const columns = Math.max(cells.length, 1)
  const hasFurigana = groups.length > 0
  return (
    <span
      className={
        "answer-grid-value reading-answer-value reading-answer-diff-line" +
        (hasFurigana ? " reading-answer-diff-line-has-furigana" : "")
      }
      lang="ja"
      aria-labelledby={labelId}
      aria-describedby={description ? descId : undefined}
      data-reading-diff-line={line}
      tabIndex={hasFurigana ? 0 : undefined}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1.4em)`,
      }}
    >
      {description && (
        <span id={descId} className="sr-only">
          {description}
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
 * Splits `total` diff columns into rows of at most `perRow`, without breaking
 * a furigana group across two rows (unless one group alone is wider than a
 * row) — so a reading always floats over its own characters.
 */
export function rowRanges(
  total: number,
  perRow: number,
  groups: FuriganaGroup[],
): [number, number][] {
  const ranges: [number, number][] = []
  let start = 0
  while (start < total) {
    let end = Math.min(start + perRow, total)
    for (const group of groups) {
      if (group.start > start && group.start < end && group.end >= end) {
        end = Math.min(end, group.start)
      }
    }
    ranges.push([start, end])
    start = end
  }
  return ranges
}

/** `groups` narrowed to the columns [start, end), re-based to start at 0. */
function groupsInRange(
  groups: FuriganaGroup[],
  start: number,
  end: number,
): FuriganaGroup[] {
  return groups
    .filter((group) => group.start >= start && group.start < end)
    .map((group) => ({
      ...group,
      start: group.start - start,
      end: Math.min(group.end, end - 1) - start,
    }))
}

/**
 * How many diff columns fit across the space the comparison can take up
 * (its parent's content box), leaving room for the maru/cross mark beside
 * each line. A diff line can't wrap on its own — its two lines' columns must
 * stay lined up — so a long answer is instead split into row pairs of this
 * many columns rather than overflowing the card. Stays at `total` (one row)
 * where there's no layout to measure (jsdom).
 */
function useColumnsPerRow(
  ref: RefObject<HTMLDivElement | null>,
  total: number,
): number {
  const [perRow, setPerRow] = useState(total)
  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent || typeof ResizeObserver === "undefined") {
      setPerRow(total)
      return
    }
    function measure() {
      const line = el!.querySelector<HTMLElement>(".reading-answer-diff-line")
      const row = line?.parentElement
      if (!line || !row) return
      const parentStyle = getComputedStyle(parent!)
      const available =
        parent!.clientWidth -
        parseFloat(parentStyle.paddingLeft) -
        parseFloat(parentStyle.paddingRight)
      const lineStyle = getComputedStyle(line)
      const fontPx = parseFloat(lineStyle.fontSize)
      const gapPx = parseFloat(lineStyle.columnGap) || 0
      const markPx =
        row.getBoundingClientRect().width - line.getBoundingClientRect().width
      const fits = Math.floor(
        (available - markPx + gapPx) / (fontPx * 1.4 + gapPx),
      )
      setPerRow(Math.max(1, Math.min(total, fits)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [ref, total])
  return Math.max(1, Math.min(perRow, total))
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
  readings,
  answeredCorrectly,
}: AnswerComparisonProps) {
  const correctId = useId()
  const yoursId = useId()
  const isCorrect = answeredCorrectly ?? typed === expected
  const hasKanji = KANJI.test(expected)
  const segments =
    hasKanji && readings && Object.keys(readings).length > 0
      ? furiganaSegments(expected, readings, reading)
      : undefined
  // A card can carry a furigana map without any whole-word reading — e.g.
  // 特殊な製法 with 特殊/製法 mapped but no pronunciation field, which has no
  // reading mode and so never fills `reading`. Flattening the segments gives
  // those cards a whole-word reading for the screen-reader description; it
  // comes back undefined for a map that annotates only part of the answer,
  // which is exactly when there is no whole-word reading to announce.
  const flatReading = reading?.trim() || joinSegmentReadings(segments)
  const showRuby = hasKanji && Boolean(segments || flatReading?.trim())
  const diff = isCorrect ? null : buildAlignedDiff(expected, typed)
  const comparisonRef = useRef<HTMLDivElement>(null)
  const perRow = useColumnsPerRow(comparisonRef, diff?.correct.length ?? 0)

  if (diff) {
    const groups = furiganaGroups(
      diff.correct,
      showRuby ? flatReading : undefined,
      segments,
    )
    const description = showRuby ? flatReading?.trim() : undefined
    const rows = rowRanges(diff.correct.length, perRow, groups)
    return (
      <div
        ref={comparisonRef}
        className="reading-answer-comparison has-diff"
        role="group"
        aria-label="答えの比較"
      >
        {rows.map(([start, end], i) => {
          const rowGroups = groupsInRange(groups, start, end)
          // Only the first row carries the marks — on later rows they'd
          // read as grading each row separately.
          const first = i === 0
          return (
            <div key={start} className="reading-answer-pair">
              <div className="reading-answer-row">
                {first && (
                  <span id={correctId} className="answer-grid-label sr-only">
                    正解
                  </span>
                )}
                {/* The maru needs the same margin-top as a line that
                    reserves room for floating furigana, so align-items:
                    center still centers it on the kanji — see
                    .answer-correct-row-has-furigana in index.css. */}
                <span
                  className={
                    "answer-correct-row" +
                    (rowGroups.length > 0 ? " answer-correct-row-has-furigana" : "")
                  }
                >
                  <DiffLine
                    cells={diff.correct.slice(start, end)}
                    labelId={correctId}
                    line="correct"
                    groups={rowGroups}
                    description={first ? description : undefined}
                  />
                  {first && <span className="maru-mark" aria-hidden="true" />}
                </span>
              </div>
              <div className="reading-answer-row">
                {first && (
                  <span id={yoursId} className="answer-grid-label sr-only">
                    あなたの答え
                  </span>
                )}
                <span className="answer-incorrect-row">
                  <DiffLine
                    cells={diff.yours.slice(start, end)}
                    labelId={yoursId}
                    line="yours"
                  />
                  {first && (
                    <>
                      <span className="cross-mark" aria-hidden="true" />
                      <span className="sr-only">不正解です</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const correctBody = (
    <span
      className="answer-grid-value reading-answer-value"
      lang="ja"
      aria-labelledby={correctId}
    >
      {segments
        ? segments.map((s, i) =>
            s.reading?.trim() ? (
              <ruby key={i}>
                {s.text}
                <rt>{s.reading}</rt>
              </ruby>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )
        : expected || "—"}
    </span>
  )

  const correctAnswer = showRuby ? (
    <span className="ruby-hover" tabIndex={0}>
      {segments ? (
        correctBody
      ) : (
        <ruby>
          {correctBody}
          <rt>{flatReading}</rt>
        </ruby>
      )}
    </span>
  ) : (
    correctBody
  )

  return (
    <div
      ref={comparisonRef}
      className="reading-answer-comparison"
      role="group"
      aria-label="答え"
    >
      <div className="reading-answer-row">
        <span id={correctId} className="answer-grid-label sr-only">
          正解
        </span>
        <span className="answer-correct-row">
          {correctAnswer}
          <span className="maru-mark" aria-hidden="true" />
          <span className="sr-only">正解です</span>
        </span>
      </div>
    </div>
  )
}

import { diffChars } from "diff"

type Props = {
  typed: string
  expected: string
  reading?: string
}

/**
 * Stacked diff display for gap-fill (grammar construction) cards.
 * Line 1: correct answer with ruby reading on hover — matching chars green,
 *          chars user missed in blue.
 * Line 2: user's answer — matching chars green, extra chars in red.
 */
export function GapAnswerDiff({ typed, expected, reading }: Props) {
  const parts = diffChars(expected, typed)

  const showRuby =
    Boolean(reading?.trim()) && /[\u4e00-\u9fff]/.test(expected)

  const expectedContent = parts.map((part, i) =>
    part.added ? null : (
      <span
        key={`e-${i}`}
        className={
          part.removed
            ? "reading-diff-chunk reading-diff-missing"
            : "reading-diff-chunk reading-diff-same"
        }
      >
        {part.value}
      </span>
    ),
  )

  return (
    <div className="reading-diff" lang="ja">
      <p className="reading-diff-line">
        {showRuby ? (
          <span className="ruby-hover" tabIndex={0}>
            <ruby>
              {expectedContent}
              <rt>{reading}</rt>
            </ruby>
          </span>
        ) : (
          expectedContent
        )}
      </p>
      <p className="reading-diff-line muted-label">
        {parts.map((part, i) =>
          part.removed ? null : (
            <span
              key={`t-${i}`}
              className={
                part.added
                  ? "reading-diff-chunk reading-diff-extra"
                  : "reading-diff-chunk reading-diff-same"
              }
            >
              {part.value}
            </span>
          ),
        )}
      </p>
    </div>
  )
}

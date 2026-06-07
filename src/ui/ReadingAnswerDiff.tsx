import { diffChars } from "diff"

type Props = {
  typed: string
  expected: string
}

/**
 * Stacked diff display for reading cards.
 * Line 1: correct answer — matching chars green, chars user missed in blue.
 * Line 2: user's answer — matching chars green, extra chars in red.
 */
export function ReadingAnswerDiff({ typed, expected }: Props) {
  const parts = diffChars(expected, typed)

  return (
    <div className="reading-diff" lang="ja">
      <p className="reading-diff-line">
        {parts.map((part, i) =>
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

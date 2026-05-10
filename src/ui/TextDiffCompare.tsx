import { diffChars } from "diff"

type Props = {
  typed: string
  expected: string
}

/**
 * Side-by-side character diff (expected vs typed). Highlights use dark-theme-safe
 * backgrounds with light text for contrast (WCAG-friendly on #12121a page bg).
 */
export function TextDiffCompare({ typed, expected }: Props) {
  const parts = diffChars(expected, typed)
  let yoursLen = 0
  let cardLen = 0
  for (const p of parts) {
    if (!p.removed) yoursLen += p.value.length
    if (!p.added) cardLen += p.value.length
  }

  return (
    <div
      className="compare-diff"
      role="group"
      aria-label="Comparison of your answer and the correct answer"
    >
      <div className="compare-col">
        <strong id="lbl-yours">Yours</strong>
        <p
          className="diff-line"
          aria-labelledby="lbl-yours"
          lang="ja"
        >
          {yoursLen === 0 ? (
            <span className="muted">—</span>
          ) : (
            parts.map((part, i) =>
              part.removed ? null : (
                <span
                  key={`y-${i}`}
                  className={
                    part.added ? "diff-chunk diff-extra" : "diff-chunk diff-same"
                  }
                >
                  {part.value}
                </span>
              ),
            )
          )}
        </p>
      </div>
      <div className="compare-col">
        <strong id="lbl-card">Card</strong>
        <p
          className="diff-line"
          aria-labelledby="lbl-card"
          lang="ja"
        >
          {cardLen === 0 ? (
            <span className="muted">—</span>
          ) : (
            parts.map((part, i) =>
              part.added ? null : (
                <span
                  key={`c-${i}`}
                  className={
                    part.removed ? "diff-chunk diff-missing" : "diff-chunk diff-same"
                  }
                >
                  {part.value}
                </span>
              ),
            )
          )}
        </p>
      </div>
    </div>
  )
}

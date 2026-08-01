type Props = {
  due: number
  className?: string
}

const TRACK_WIDTH = 40
const HEIGHT = 8

/** Cards due at or beyond this far out render a full bar — an absolute,
 * shared horizon so bars are directly comparable across cards, rather than
 * each card's fullness being relative to its own (wildly varying) interval
 * length. */
const MAX_HORIZON_MS = 30 * 24 * 60 * 60 * 1000

/** Countdown bar to a card's next review, on a fixed 30-day horizon shared by every card — full at 30+ days away, shrinking to empty as the due date arrives (or if it's already overdue). */
export function NextReviewBar({ due, className }: Props) {
  const remaining = due - Date.now()
  const fraction = Math.min(1, Math.max(0, remaining / MAX_HORIZON_MS))
  // A rounded rect narrower than its own height renders as a pointy lens,
  // not a dot, once its clamped corner radius exceeds half its width.
  // Floor the fill at HEIGHT so the smallest non-zero amount is a clean
  // circle instead.
  const fillWidth = fraction > 0 ? Math.max(HEIGHT, TRACK_WIDTH * fraction) : 0
  const label = `次回の復習: ${new Date(due).toLocaleDateString()}`

  return (
    <span
      className={className ? `next-review-bar ${className}` : "next-review-bar"}
      role="img"
      aria-label={label}
      title={label}
    >
      <svg viewBox={`0 0 ${TRACK_WIDTH} ${HEIGHT}`} width={TRACK_WIDTH} height={HEIGHT} aria-hidden="true">
        <rect
          x={0}
          y={0}
          width={TRACK_WIDTH}
          height={HEIGHT}
          rx={HEIGHT / 2}
          className="next-review-bar-track"
        />
        <rect
          x={0}
          y={0}
          width={fillWidth}
          height={HEIGHT}
          rx={HEIGHT / 2}
          className="next-review-bar-fill"
        />
      </svg>
    </span>
  )
}

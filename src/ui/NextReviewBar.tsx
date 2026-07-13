type Props = {
  due: number
  lastReview?: number
  className?: string
}

const TRACK_WIDTH = 40
const HEIGHT = 8

/** Countdown bar to a card's next review — full right after being scheduled, shrinking to empty as the due date arrives (or if it's already overdue). */
export function NextReviewBar({ due, lastReview, className }: Props) {
  const now = Date.now()
  const total = lastReview != null ? due - lastReview : 0
  const remaining = due - now
  const fraction = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0
  const fillWidth = TRACK_WIDTH * fraction
  const label = `Next review: ${new Date(due).toLocaleDateString()}`

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

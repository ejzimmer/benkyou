import { FSRS_STATE_ORDER, fsrsStateLabel } from "../lib/sync/syncCompare"

type Props = {
  state: number
  className?: string
}

const DOT_GAP = 14
const DOT_Y = 8
const DOT_X0 = 8

/** One colour per FSRS state — New starts neutral blue, Learning is the
 * cautious in-progress stage, Review is the settled/mastered stage (green,
 * matching the app's review colour), and Relearning follows a lapse (pink,
 * matching the app's existing "incorrect" colour). Indexed by FSRS state,
 * not by the diagram's left-to-right display position. */
const STAGE_COLORS = ["var(--blue)", "var(--orange)", "var(--green)", "var(--pink)"]

/** Left-to-right display order of FSRS states. Relearning sits left of
 * Review (not in raw state-number order) so that a card always moves
 * rightwards as it improves: New → Learning → graduate straight to Review,
 * or lapse back to Relearning and recover rightwards into Review again. */
const DISPLAY_ORDER = [0, 1, 3, 2]

/** Dots-and-lines readout of where a card sits in the FSRS state order, with the current stage highlighted. Rightwards is always the improving direction. */
export function SrsStageDiagram({ state, className }: Props) {
  const width = DOT_X0 * 2 + DOT_GAP * (DISPLAY_ORDER.length - 1)

  return (
    <span
      className={className ? `srs-stage-diagram ${className}` : "srs-stage-diagram"}
      role="img"
      aria-label={`復習ステージ: ${fsrsStateLabel(state)}`}
    >
      <svg viewBox={`0 0 ${width} 16`} width={width} height={16} aria-hidden="true">
        {DISPLAY_ORDER.slice(1).map((_, i) => (
          <line
            key={i}
            x1={DOT_X0 + i * DOT_GAP}
            y1={DOT_Y}
            x2={DOT_X0 + (i + 1) * DOT_GAP}
            y2={DOT_Y}
            className="srs-stage-diagram-line"
          />
        ))}
        {DISPLAY_ORDER.map((stateIndex, position) => {
          const color = STAGE_COLORS[stateIndex]
          const isCurrent = stateIndex === state
          return (
            <circle
              key={stateIndex}
              cx={DOT_X0 + position * DOT_GAP}
              cy={DOT_Y}
              r={isCurrent ? 4.5 : 2.5}
              fill={color}
              style={isCurrent ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}
              className={
                isCurrent
                  ? "srs-stage-diagram-dot srs-stage-diagram-dot-current"
                  : "srs-stage-diagram-dot"
              }
            >
              <title>{FSRS_STATE_ORDER[stateIndex]}</title>
            </circle>
          )
        })}
      </svg>
    </span>
  )
}

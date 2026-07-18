import { useMemo } from "react"
import { Link } from "react-router-dom"
import { ChevronLeftIcon } from "../../ui/ChevronLeftIcon"

const CONFETTI_COLORS = [
  "var(--blue)",
  "var(--green)",
  "var(--pink)",
  "var(--orange)",
  "#ffffff",
]

const CONFETTI_PIECE_COUNT = 60

type ConfettiPiece = {
  left: number
  color: string
  delay: number
  duration: number
  rotate: number
  width: number
  height: number
}

function useConfettiPieces(count: number): ConfettiPiece[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (): ConfettiPiece => {
        const width = 6 + Math.random() * 6
        return {
          left: Math.random() * 100,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          delay: Math.random() * 3,
          duration: 3 + Math.random() * 2.5,
          rotate: Math.random() * 360,
          width,
          height: width * 0.4,
        }
      }),
    [count],
  )
}

type Props = {
  /** Where the back chevron (top left) exits review to. */
  backTo: string
  onUndoLastJudgement: () => void
}

export function ReviewSessionComplete({ backTo, onUndoLastJudgement }: Props) {
  const pieces = useConfettiPieces(CONFETTI_PIECE_COUNT)

  return (
    <div className="page review review-complete">
      <header className="header review-header">
        <Link to={backTo} className="back-link" aria-label="Exit review">
          <ChevronLeftIcon className="back-chevron" />
        </Link>
      </header>

      <div className="review-complete-body">
        <div className="review-complete-confetti" aria-hidden="true">
          {pieces.map((piece, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                width: `${piece.width}px`,
                height: `${piece.height}px`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotate}deg)`,
              }}
            />
          ))}
        </div>

        <p className="review-complete-message">全カードやり終わった!</p>

        <div className="review-complete-actions">
          <Link to="/" className="btn primary">
            Home
          </Link>
          <button type="button" className="btn secondary" onClick={onUndoLastJudgement}>
            Undo last judgement
          </button>
        </div>
      </div>
    </div>
  )
}

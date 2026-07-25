import { useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { ChevronLeftIcon } from "../../ui/ChevronLeftIcon"
import { UserMenu } from "../../ui/UserMenu"
import { SyncButton } from "../../ui/SyncButton"
import { useSync } from "../../lib/sync/SyncContext"

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
}

function useConfettiPieces(): ConfettiPiece[] {
  return useMemo(
    () =>
      Array.from({ length: CONFETTI_PIECE_COUNT }, (): ConfettiPiece => ({
        left: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2.5,
        rotate: Math.random() * 360,
        width: 6 + Math.random() * 6,
      })),
    [],
  )
}

type Props = {
  /** Where the back chevron (top left) exits review to. */
  backTo: string
  onUndoLastJudgement: () => void
}

export function ReviewSessionComplete({ backTo, onUndoLastJudgement }: Props) {
  const pieces = useConfettiPieces()
  const { syncEditsNow } = useSync()

  // Reaching this screen means judgements are sitting locally, pending sync
  // — push them once automatically so a second device doesn't need the user
  // to remember to press the button. Runs once per mount (each time the
  // queue empties out), reuses the same push-only path as the manual
  // button, and shares its in-flight guard, error handling, and retry (via
  // the button) — no full two-way sync here, since that's what caused the
  // freezes when this was tried before.
  useEffect(() => {
    syncEditsNow().catch(() => {})
  }, [syncEditsNow])

  return (
    <div className="page review review-complete">
      <header className="header review-header">
        <Link to={backTo} className="back-link" aria-label="Exit review">
          <ChevronLeftIcon className="back-chevron" />
        </Link>
        <div className="review-header-actions">
          <UserMenu />
          <SyncButton />
        </div>
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
                height: `${piece.width * 0.4}px`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotate}deg)`,
              }}
            />
          ))}
        </div>

        <h1 className="review-complete-message">全カードやり終わった!</h1>

        <div className="review-complete-actions">
          <Link to="/" className="btn primary">
            ホーム
          </Link>
          <button type="button" className="btn secondary" onClick={onUndoLastJudgement}>
            取り消す
          </button>
        </div>
      </div>
    </div>
  )
}

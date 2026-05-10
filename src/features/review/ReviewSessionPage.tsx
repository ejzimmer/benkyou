import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Link, useParams } from "react-router-dom"
import {
  commitJudgement,
  prefetchDueForSession,
  prepareJudgement,
  restoreSchedulingSnapshot,
  undoLastJudgement,
  type DueItem,
  type JudgementSnapshot,
} from "../../services/review"
import { useAuth } from "../../lib/auth/AuthContext"
import { hasNonHiraganaKana } from "../../lib/japanese/normalize"
import {
  isSynonymAnswer,
  matchesPrimaryJapanese,
} from "../../lib/japanese/synonyms"
import { ReviewSessionAnswerPanel } from "./ReviewSessionAnswerPanel"
import { ReviewSessionPromptBody } from "./ReviewSessionPromptBody"
import { expectedAnswer, REVIEW_MODE_LABELS } from "./reviewFlowHelpers"

const INCORRECT_ADVANCE_DELAY_MS = 550

type Phase = "prompt" | "answer"

export function ReviewSessionPage() {
  const { deckId } = useParams()
  const { user } = useAuth()
  const [sessionQueue, setSessionQueue] = useState<DueItem[]>([])
  const [phase, setPhase] = useState<Phase>("prompt")
  const [typed, setTyped] = useState("")
  const [synonymWarn, setSynonymWarn] = useState(false)
  const [readingWarn, setReadingWarn] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [snapshot, setSnapshot] = useState<JudgementSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingIncorrectDelay, setPendingIncorrectDelay] = useState(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const all = await prefetchDueForSession()
    const q = deckId ? all.filter((x) => x.card.deckId === deckId) : all
    setSessionQueue(q)
    setPhase("prompt")
    setTyped("")
    setSynonymWarn(false)
    setReadingWarn(false)
    setStartedAt(null)
    setSnapshot(null)
    setPendingIncorrectDelay(false)
    setLoading(false)
  }, [deckId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  const current = sessionQueue[0]

  useEffect(() => {
    if (current && phase === "prompt" && !pendingIncorrectDelay) {
      setStartedAt(performance.now())
    }
  }, [current, phase, pendingIncorrectDelay])

  const modeLabel = useMemo(() => {
    if (!current) return ""
    return REVIEW_MODE_LABELS[current.modeId]
  }, [current])

  function resetPromptAfterJudgement() {
    setTyped("")
    setSynonymWarn(false)
    setReadingWarn(false)
    setStartedAt(null)
    setSnapshot(null)
  }

  async function prepareAndShowAnswer() {
    if (!current) return
    const snap = await prepareJudgement(current.card.id, current.modeId)
    setSnapshot(snap)
    setPhase("answer")
    if (
      current.modeId === "vocab_type_reading" &&
      typed &&
      hasNonHiraganaKana(typed)
    ) {
      setReadingWarn(true)
    }
  }

  function checkSubmitTyped(): boolean {
    if (!current) return true
    const c = current.card
    const m = current.modeId
    if (
      m === "vocab_type_word_from_clue" ||
      m === "grammar_type_construction"
    ) {
      if (isSynonymAnswer(c, typed) && !matchesPrimaryJapanese(c, typed)) {
        setSynonymWarn(true)
        return false
      }
    }
    if (m === "vocab_type_reading" && typed && hasNonHiraganaKana(typed)) {
      setReadingWarn(true)
    }
    return true
  }

  const tryShowAnswerRef = useRef(() => {})
  tryShowAnswerRef.current = () => {
    if (!checkSubmitTyped()) return
    void prepareAndShowAnswer()
  }

  /** Enter on oral / non-input views (inputs handle Enter separately) */
  useEffect(() => {
    if (phase !== "prompt" || !current || pendingIncorrectDelay || loading) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)
        return
      e.preventDefault()
      tryShowAnswerRef.current()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [phase, current, pendingIncorrectDelay, loading])

  async function onJudge(correct: boolean) {
    if (!current || pendingIncorrectDelay) return
    const item = current
    const ms =
      startedAt != null ? Math.round(performance.now() - startedAt) : null
    await commitJudgement(
      item.card.id,
      item.modeId,
      ms,
      correct,
      snapshot,
      user,
    )

    if (correct) {
      setSessionQueue((q) => q.slice(1))
      resetPromptAfterJudgement()
      setPhase("prompt")
      return
    }

    const [first, ...rest] = sessionQueue
    if (!first) return

    const delayMs = rest.length > 0 ? INCORRECT_ADVANCE_DELAY_MS : 0
    setSessionQueue([...rest, first])

    resetPromptAfterJudgement()
    setPhase("prompt")

    if (delayMs === 0) return

    setPendingIncorrectDelay(true)
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null
      setPendingIncorrectDelay(false)
    }, delayMs)
  }

  async function onUndoAnswer() {
    if (snapshot) await restoreSchedulingSnapshot(snapshot, user)
    setPhase("prompt")
    setSnapshot(null)
  }

  async function onUndoJudgementFromHeader() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    setPendingIncorrectDelay(false)

    const undone = await undoLastJudgement(user)
    if (!undone) return

    setSessionQueue((q) => {
      const filtered = q.filter(
        (item) =>
          item.card.id !== undone.card.id || item.modeId !== undone.modeId,
      )
      return [undone, ...filtered]
    })

    const snap = await prepareJudgement(undone.card.id, undone.modeId)
    setTyped("")
    setSynonymWarn(false)
    setReadingWarn(false)
    if (!snap) {
      setSnapshot(null)
      setPhase("prompt")
      return
    }
    setSnapshot(snap)
    setPhase("answer")
    // Skip prompt phase — measure FSRS latency from this judgement screen only
    setStartedAt(performance.now())
  }

  if (loading) return <div className="page">Loading queue…</div>

  if (!current) {
    return (
      <div className="page">
        <header className="header review-header">
          <Link to={deckId ? `/decks/${deckId}` : "/"}>← Back</Link>
          <div className="review-header-actions">
            <button
              type="button"
              className="btn"
              onClick={() => void onUndoJudgementFromHeader()}
            >
              Undo last judgement
            </button>
          </div>
          <h1>Done</h1>
        </header>
        <p className="muted">Nothing due right now.</p>
        <button type="button" className="btn" onClick={load}>
          Refresh
        </button>
      </div>
    )
  }

  const item = current
  const exp = expectedAnswer(item.card, item.modeId)

  return (
    <div className="page review">
      <header className="header review-header">
        <Link to={deckId ? `/decks/${deckId}` : "/"}>← Exit</Link>
        <div className="review-header-main">
          <p className="muted small">
            {sessionQueue.length} left · {item.modeId}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => void onUndoJudgementFromHeader()}
          >
            Undo last judgement
          </button>
        </div>
      </header>

      <section className="panel prompt">
        <h2>{modeLabel}</h2>

        {phase === "prompt" && !pendingIncorrectDelay && (
          <>
            <ReviewSessionPromptBody
              item={item}
              typed={typed}
              onTypedChange={setTyped}
              readingWarn={readingWarn}
              synonymWarn={synonymWarn}
              onTypedSubmit={() => tryShowAnswerRef.current()}
            />
            <div className="toolbar">
              <button
                type="button"
                className="btn primary"
                onClick={() => tryShowAnswerRef.current()}
              >
                Show answer
              </button>
            </div>
          </>
        )}

        {pendingIncorrectDelay && (
          <p className="muted small">Next card…</p>
        )}

        {phase === "answer" && (
          <ReviewSessionAnswerPanel
            item={item}
            typed={typed}
            expected={exp}
            pendingIncorrectDelay={pendingIncorrectDelay}
            onJudge={(correct) => void onJudge(correct)}
            onUndoAnswer={() => void onUndoAnswer()}
          />
        )}
      </section>
    </div>
  )
}

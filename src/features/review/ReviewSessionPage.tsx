import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { toHiragana } from "wanakana"
import {
  commitJudgement,
  getDueQueue,
  prepareJudgement,
  requeueAfterIncorrect,
  restoreSchedulingSnapshot,
  undoLastJudgement,
  type DueItem,
  type JudgementSnapshot,
} from "../../services/review"
import { useAuth } from "../../lib/auth/AuthContext"
import { useSync } from "../../lib/sync/SyncContext"
import { ReviewSyncGate } from "./ReviewSyncGate"
import { finalizeReadingAnswer } from "../../lib/japanese/normalize"
import {
  isSynonymAnswer,
  matchesPrimaryJapanese,
} from "../../lib/japanese/synonyms"
import { CARD_KIND_LABELS } from "../../domain/types"
import { ReviewSessionAnswerPanel } from "./ReviewSessionAnswerPanel"
import { ReviewSessionPromptBody } from "./ReviewSessionPromptBody"
import {
  expectedAnswer,
  hasNonHiraganaReadingAnswer,
  isReadingTypingMode,
  modeHeadingVisible,
  requiresTyping,
  REVIEW_MODE_LABELS,
} from "./reviewFlowHelpers"

const INCORRECT_ADVANCE_DELAY_MS = 550

type Phase = "prompt" | "answer"

function prioritizeResumeItem(
  queue: DueItem[],
  resumeCardId: string | null,
  resumeModeId: string | null,
): DueItem[] {
  if (!resumeCardId) return queue

  const exactIndex = queue.findIndex(
    (item) => item.card.id === resumeCardId && item.modeId === resumeModeId,
  )
  const fallbackIndex =
    exactIndex >= 0
      ? exactIndex
      : queue.findIndex((item) => item.card.id === resumeCardId)

  if (fallbackIndex <= 0) return queue

  const rest = [...queue]
  const [item] = rest.splice(fallbackIndex, 1)

  // `item` must land exactly at the front — CardEditPage's "back" link and
  // the resume URL params depend on the resumed card/mode reappearing
  // immediately. If that leaves another due item for the same card right
  // behind it (rest[0]), move that one conflicting neighbour back instead of
  // disturbing where `item` goes.
  if (rest[0]?.card.id === item.card.id) {
    const [conflict, ...remainder] = rest
    return [item, ...requeueAfterIncorrect(remainder, conflict)]
  }
  return [item, ...rest]
}

export function ReviewSessionPage() {
  const { deckId } = useParams()
  const [searchParams] = useSearchParams()
  const resumeCardId = searchParams.get("resumeCardId")
  const resumeModeId = searchParams.get("resumeModeId")
  const resumePhase = searchParams.get("resumePhase")
  const resumeTyped = searchParams.get("resumeTyped")
  const { user } = useAuth()
  const {
    initialSyncComplete,
    syncProgress,
    syncStatusLabel,
    conflictResolutionVersion,
  } = useSync()
  const [sessionQueue, setSessionQueue] = useState<DueItem[]>([])
  const [phase, setPhase] = useState<Phase>("prompt")
  const [typed, setTyped] = useState("")
  const [synonymWarn, setSynonymWarn] = useState(false)
  const [readingWarn, setReadingWarn] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [snapshot, setSnapshot] = useState<JudgementSnapshot | null>(null)
  /** Prompt shown → “Show answer” (FSRS latency heuristic); cleared after grading */
  const [promptToRevealMs, setPromptToRevealMs] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingIncorrectDelay, setPendingIncorrectDelay] = useState(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * Typed answers per judgement, newest last, so "undo last judgement" can
   * restore what was entered. In-session only — not persisted across reloads.
   */
  const judgedTypedHistoryRef = useRef<
    Array<{ cardId: string; modeId: string; typed: string }>
  >([])
  const showAnswerBtnRef = useRef<HTMLButtonElement>(null)
  const phaseRef = useRef<Phase>(phase)
  const conflictReloadPendingRef = useRef(false)
  /**
   * The resumeCardId/resumeModeId/resumePhase/resumeTyped query params stay
   * in the URL for the rest of the session (nothing clears them), so a later
   * reload — e.g. a mid-session sync conflict bumping conflictResolutionVersion
   * — must not keep replaying that stale resume state. Apply it at most once
   * per mount.
   */
  const resumeAppliedRef = useRef(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const load = useCallback(async () => {
    setLoading(true)
    const all = await getDueQueue()
    const deckQueue = deckId ? all.filter((x) => x.card.deckId === deckId) : all
    const q = prioritizeResumeItem(deckQueue, resumeCardId, resumeModeId)
    setSessionQueue(q)

    // Resuming from the edit page: put back the phase/typed answer the user
    // had before navigating away, as long as the same card+mode is still
    // the one at the front of the queue (it may not be, e.g. if the edit
    // removed the mode that was being reviewed).
    const resumedItem = q[0]
    const canResume =
      !resumeAppliedRef.current &&
      resumeCardId != null &&
      resumedItem?.card.id === resumeCardId &&
      (resumeModeId == null || resumedItem.modeId === resumeModeId)
    resumeAppliedRef.current = true

    const restoredTyped = canResume ? (resumeTyped ?? "") : ""
    setTyped(restoredTyped)
    setSynonymWarn(false)
    setReadingWarn(false)
    setStartedAt(null)
    setPromptToRevealMs(null)
    setPendingIncorrectDelay(false)

    if (canResume && resumePhase === "answer" && resumedItem) {
      const snap = await prepareJudgement(
        resumedItem.card.id,
        resumedItem.modeId,
      )
      setSnapshot(snap)
      setPhase(snap ? "answer" : "prompt")
      if (
        snap &&
        isReadingTypingMode(resumedItem.modeId) &&
        restoredTyped &&
        hasNonHiraganaReadingAnswer(restoredTyped)
      ) {
        setReadingWarn(true)
      }
    } else {
      setSnapshot(null)
      setPhase("prompt")
    }

    setLoading(false)
  }, [deckId, resumeCardId, resumeModeId, resumePhase, resumeTyped])

  useEffect(() => {
    // Wait for the first sync to finish so the queue reflects the latest cards
    // and scheduling rather than stale local data. Also reload whenever a
    // later sync resolves a conflict — that can overwrite the card/scheduling
    // row this session is holding with the merged version.
    if (!initialSyncComplete) return
    // Don't yank the current card out from under the user while they're
    // looking at the revealed answer, deciding correct/incorrect — defer
    // until they've moved back to a prompt.
    if (phaseRef.current === "answer") {
      conflictReloadPendingRef.current = true
      return
    }
    load()
    // phaseRef is a ref mirror, read but intentionally not a dependency here.
  }, [load, initialSyncComplete, conflictResolutionVersion])

  useEffect(() => {
    if (phase === "prompt" && conflictReloadPendingRef.current) {
      conflictReloadPendingRef.current = false
      load()
    }
  }, [phase, load])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  const current = sessionQueue[0]

  const handleTypedChange = useCallback(
    (value: string) => {
      if (current && isReadingTypingMode(current.modeId)) {
        setTyped(toHiragana(value, { IMEMode: true }))
      } else {
        setTyped(value)
      }
    },
    [current],
  )

  useEffect(() => {
    if (current && phase === "prompt" && !pendingIncorrectDelay) {
      setStartedAt(performance.now())
    }
  }, [current, phase, pendingIncorrectDelay])

  const modeLabel = useMemo(() => {
    if (!current) return ""
    return REVIEW_MODE_LABELS[current.modeId]
  }, [current])

  useEffect(() => {
    if (
      phase === "prompt" &&
      current &&
      !pendingIncorrectDelay &&
      !requiresTyping(current.modeId)
    ) {
      showAnswerBtnRef.current?.focus({ preventScroll: true })
    }
  }, [phase, current, pendingIncorrectDelay])

  function resetPromptAfterJudgement() {
    setTyped("")
    setSynonymWarn(false)
    setReadingWarn(false)
    setStartedAt(null)
    setSnapshot(null)
    setPromptToRevealMs(null)
  }

  async function prepareAndShowAnswer(typedValue: string = typed) {
    if (!current) return
    const elapsed =
      startedAt != null ? Math.round(performance.now() - startedAt) : null
    const snap = await prepareJudgement(current.card.id, current.modeId)
    setPromptToRevealMs(elapsed)
    setSnapshot(snap)
    setPhase("answer")
    if (
      isReadingTypingMode(current.modeId) &&
      typedValue &&
      hasNonHiraganaReadingAnswer(typedValue)
    ) {
      setReadingWarn(true)
    }
  }

  function checkSubmitTyped(typedValue: string = typed): boolean {
    if (!current) return true
    const c = current.card
    const m = current.modeId
    if (
      m === "vocab_type_word_from_clue" ||
      m === "grammar_type_construction"
    ) {
      if (
        isSynonymAnswer(c, typedValue) &&
        !matchesPrimaryJapanese(c, typedValue)
      ) {
        setSynonymWarn(true)
        return false
      }
    }
    if (isReadingTypingMode(m) && typedValue && hasNonHiraganaReadingAnswer(typedValue)) {
      setReadingWarn(true)
    }
    return true
  }

  const tryShowAnswerRef = useRef(() => {})
  tryShowAnswerRef.current = () => {
    let finalTyped = typed
    if (current && isReadingTypingMode(current.modeId) && typed) {
      finalTyped = finalizeReadingAnswer(typed)
      if (finalTyped !== typed) setTyped(finalTyped)
    }
    if (!checkSubmitTyped(finalTyped)) return
    void prepareAndShowAnswer(finalTyped)
  }

  /** Enter on oral / non-input views (inputs handle Enter separately) */
  useEffect(() => {
    if (phase !== "prompt" || !current || pendingIncorrectDelay || loading)
      return
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
    // Remember the answer entered so undoing this judgement can show it again.
    judgedTypedHistoryRef.current.push({
      cardId: item.card.id,
      modeId: item.modeId,
      typed,
    })
    await commitJudgement(
      item.card.id,
      item.modeId,
      promptToRevealMs,
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
    setSessionQueue(requeueAfterIncorrect(rest, first))

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
    setPromptToRevealMs(null)
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
      // Must land exactly at the front, not just near it: the code below
      // sets phase/snapshot/typed for `undone` and treats it as `current`
      // (sessionQueue[0]) — placing it anywhere else would decouple what's
      // rendered from the judgement state held here.
      return [undone, ...filtered]
    })

    const snap = await prepareJudgement(undone.card.id, undone.modeId)
    const lastTyped = judgedTypedHistoryRef.current.pop()
    const restoredTyped =
      lastTyped &&
      lastTyped.cardId === undone.card.id &&
      lastTyped.modeId === undone.modeId
        ? lastTyped.typed
        : ""
    setTyped(restoredTyped)
    setSynonymWarn(false)
    setReadingWarn(false)
    if (!snap) {
      setSnapshot(null)
      setPhase("prompt")
      return
    }
    setSnapshot(snap)
    setPhase("answer")
    // No prompt→reveal pass yet — grading uses neutral timing (null → Good if correct)
    setPromptToRevealMs(null)
    setStartedAt(null)
  }

  if (!initialSyncComplete) {
    return (
      <ReviewSyncGate
        progress={syncProgress}
        statusLabel={syncStatusLabel}
        backTo={deckId ? `/decks/${deckId}` : "/"}
      />
    )
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
  const reviewReturnParams = new URLSearchParams({
    resumeCardId: item.card.id,
    resumeModeId: item.modeId,
    resumePhase: phase,
    resumeTyped: typed,
  })
  const reviewReturnTo = `${deckId ? `/decks/${deckId}/review` : "/review"}?${reviewReturnParams}`

  return (
    <div className="page review">
      <header className="header review-header">
        <Link to={deckId ? `/decks/${deckId}` : "/"}>← Exit</Link>
        <div className="review-header-main">
          <p className="muted small">
            {sessionQueue.length} left · {CARD_KIND_LABELS[item.card.kind]}
          </p>
          <div className="review-header-actions">
            <Link
              to={`/decks/${item.card.deckId}/cards/${encodeURIComponent(item.card.id)}?returnTo=${encodeURIComponent(
                reviewReturnTo,
              )}`}
              className="btn"
            >
              Edit card
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => void onUndoJudgementFromHeader()}
            >
              Undo last judgement
            </button>
          </div>
        </div>
      </header>

      <section className="panel prompt">
        {modeLabel && (
          <h2 className={current && modeHeadingVisible(current.modeId) ? undefined : "sr-only"}>
            {modeLabel}
          </h2>
        )}

        {phase === "prompt" && !pendingIncorrectDelay && (
          <>
            <ReviewSessionPromptBody
              item={item}
              typed={typed}
              onTypedChange={handleTypedChange}
              readingWarn={readingWarn}
              synonymWarn={synonymWarn}
              onTypedSubmit={() => tryShowAnswerRef.current()}
            />
            <div className="toolbar">
              <button
                ref={showAnswerBtnRef}
                type="button"
                className="btn primary"
                onClick={() => tryShowAnswerRef.current()}
              >
                Show answer
              </button>
            </div>
          </>
        )}

        {pendingIncorrectDelay && <p className="muted small">Next card…</p>}

        {phase === "answer" && !pendingIncorrectDelay && (
          <>
            <ReviewSessionPromptBody
              item={item}
              typed={typed}
              onTypedChange={handleTypedChange}
              readingWarn={readingWarn}
              synonymWarn={synonymWarn}
              onTypedSubmit={() => {}}
              revealed
            />
            <ReviewSessionAnswerPanel
              item={item}
              typed={typed}
              expected={exp}
              pendingIncorrectDelay={pendingIncorrectDelay}
              onJudge={(correct) => void onJudge(correct)}
              onUndoAnswer={() => void onUndoAnswer()}
            />
          </>
        )}
      </section>
    </div>
  )
}

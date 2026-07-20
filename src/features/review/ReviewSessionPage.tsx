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
import { useSync } from "../../lib/sync/SyncContext"
import { finalizeReadingAnswer, hasLatinScript } from "../../lib/japanese/normalize"
import {
  isSynonymAnswer,
  matchesPrimaryJapanese,
} from "../../lib/japanese/synonyms"
import { ReviewSessionAnswerPanel } from "./ReviewSessionAnswerPanel"
import { ReviewSessionComplete } from "./ReviewSessionComplete"
import { ReviewSessionPromptBody } from "./ReviewSessionPromptBody"
import { ReviewFooter } from "./ReviewFooter"
import {
  answerMissingKanji,
  expectedAnswer,
  hasNonHiraganaReadingAnswer,
  isReadingTypingMode,
  REVIEW_MODE_LABELS,
  requiresTyping,
} from "./reviewFlowHelpers"
import { ChevronLeftIcon } from "../../ui/ChevronLeftIcon"
import { UserMenu } from "../../ui/UserMenu"

const INCORRECT_ADVANCE_DELAY_MS = 550

/**
 * `inert` disables focus/interaction for a hidden overlay layer (see the
 * always-rendered prompt/answer stack below). Not yet in this React/TS
 * version's JSX typings even though every supported browser implements it,
 * so it's spread in as a plain attribute rather than passed as a normal prop.
 */
function inertWhen(condition: boolean) {
  return (condition ? { inert: "" } : {}) as { inert?: string }
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  /**
   * Captured once per mount so `load` doesn't depend on live `searchParams` —
   * we strip these from the URL right after consuming them (see `load`) to
   * stop a later browser refresh from replaying stale resume state, and that
   * strip must not itself trigger a second, destructive `load()` call.
   */
  const resumeParamsRef = useRef({
    cardId: searchParams.get("resumeCardId"),
    modeId: searchParams.get("resumeModeId"),
    phase: searchParams.get("resumePhase"),
    typed: searchParams.get("resumeTyped"),
  })
  /**
   * `setSearchParams`'s identity can change when `searchParams` changes (e.g.
   * from `load`'s own call to it below). Reading it via a ref keeps `load`'s
   * identity stable across that, so stripping the resume params doesn't
   * retrigger the mount effect into calling `load` a second time.
   */
  const setSearchParamsRef = useRef(setSearchParams)
  setSearchParamsRef.current = setSearchParams
  const { conflictResolutionVersion } = useSync()
  const [sessionQueue, setSessionQueue] = useState<DueItem[]>([])
  const [phase, setPhase] = useState<Phase>("prompt")
  const [typed, setTyped] = useState("")
  const [synonymWarn, setSynonymWarn] = useState(false)
  const [readingWarn, setReadingWarn] = useState(false)
  const [kanjiWarn, setKanjiWarn] = useState(false)
  const [latinWarn, setLatinWarn] = useState(false)
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
   * Set once `load()` finds at least one due item this mount. Distinguishes
   * "queue emptied because the user finished reviewing" (show the
   * congratulatory ReviewSessionComplete screen) from "there was never
   * anything due to begin with" (a plain empty state) — both look like
   * `!current` otherwise.
   */
  const hadDueItemsRef = useRef(false)
  /**
   * Bumped every time the prompt (re-)becomes the active side. The
   * prompt/answer layers stay permanently mounted (so revealing the answer
   * never resizes the card) — so returning to "prompt" for the *same*
   * card/mode (Undo answer, Undo last judgement) doesn't change the typing
   * input's focusKey the way a fresh mount used to, and its autofocus effect
   * wouldn't otherwise re-run. Folded into that focusKey below to force it to.
   */
  const [promptFocusToken, setPromptFocusToken] = useState(0)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase === "prompt") setPromptFocusToken((n) => n + 1)
  }, [phase])

  const load = useCallback(async () => {
    setLoading(true)
    const {
      cardId: resumeCardId,
      modeId: resumeModeId,
      phase: resumePhase,
      typed: resumeTyped,
    } = resumeParamsRef.current
    const all = await getDueQueue()
    const deckQueue = deckId ? all.filter((x) => x.card.deckId === deckId) : all
    const q = prioritizeResumeItem(deckQueue, resumeCardId, resumeModeId)
    if (q.length > 0) hadDueItemsRef.current = true
    setSessionQueue(q)

    // Resuming from the edit page: put back the phase/typed answer the user
    // had before navigating away, as long as the same card+mode is still
    // the one at the front of the queue (it may not be, e.g. if the edit
    // removed the mode that was being reviewed).
    const resumedItem = q[0]
    const canResume =
      resumeCardId != null &&
      resumedItem?.card.id === resumeCardId &&
      (resumeModeId == null || resumedItem.modeId === resumeModeId)
    // Consumed (or deemed inapplicable) — clear so a later `load()` within
    // this same mount (e.g. a mid-session sync-conflict reload) doesn't
    // replay it, and doesn't redundantly re-strip the URL below.
    resumeParamsRef.current = { cardId: null, modeId: null, phase: null, typed: null }

    const restoredTyped = canResume ? (resumeTyped ?? "") : ""
    setTyped(restoredTyped)
    setSynonymWarn(false)
    setReadingWarn(false)
    setKanjiWarn(false)
    setLatinWarn(false)
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

    // Strip from the URL too — a later browser refresh is a fresh mount
    // (a new resumeParamsRef), so without this it would read the same
    // params straight out of the address bar and replay this now-stale
    // resume state onto whatever card happens to be due at that point.
    if (resumeCardId != null) {
      setSearchParamsRef.current(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete("resumeCardId")
          next.delete("resumeModeId")
          next.delete("resumePhase")
          next.delete("resumeTyped")
          return next
        },
        { replace: true },
      )
    }
  }, [deckId])

  useEffect(() => {
    // Reload whenever a manually-triggered sync resolves a conflict — that
    // can overwrite the card/scheduling row this session is holding with the
    // merged version.
    // Don't yank the current card out from under the user while they're
    // looking at the revealed answer, deciding correct/incorrect — defer
    // until they've moved back to a prompt.
    if (phaseRef.current === "answer") {
      conflictReloadPendingRef.current = true
      return
    }
    load()
    // phaseRef is a ref mirror, read but intentionally not a dependency here.
  }, [load, conflictResolutionVersion])

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
      // Validation messages (Latin script, kanji-missing, synonym, non-hiragana
      // reading) are about what was typed at submit time — once the user edits
      // the answer, clear them immediately rather than leaving a stale warning
      // up until the next submit attempt re-validates.
      setSynonymWarn(false)
      setReadingWarn(false)
      setKanjiWarn(false)
      setLatinWarn(false)
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
    setKanjiWarn(false)
    setLatinWarn(false)
    setStartedAt(null)
    setSnapshot(null)
    setPromptToRevealMs(null)
  }

  async function prepareAndShowAnswer() {
    if (!current) return
    const elapsed =
      startedAt != null ? Math.round(performance.now() - startedAt) : null
    const snap = await prepareJudgement(current.card.id, current.modeId)
    setPromptToRevealMs(elapsed)
    setSnapshot(snap)
    setPhase("answer")
  }

  function checkSubmitTyped(typedValue: string = typed): boolean {
    if (!current) return true
    const c = current.card
    const m = current.modeId
    setSynonymWarn(false)
    setReadingWarn(false)
    setKanjiWarn(false)
    setLatinWarn(false)
    if (
      (m === "vocab_type_word_from_clue" || m === "grammar_type_construction") &&
      hasLatinScript(typedValue) &&
      !hasLatinScript(expectedAnswer(c, m))
    ) {
      setLatinWarn(true)
      return false
    }
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
    if (m === "vocab_type_word_from_clue" && typedValue.trim()) {
      if (answerMissingKanji(typedValue, expectedAnswer(c, m))) {
        setKanjiWarn(true)
        return false
      }
    }
    if (isReadingTypingMode(m) && typedValue && hasNonHiraganaReadingAnswer(typedValue)) {
      setReadingWarn(true)
      return false
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
    void prepareAndShowAnswer()
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
    if (snapshot) await restoreSchedulingSnapshot(snapshot)
    setPhase("prompt")
    setSnapshot(null)
    setPromptToRevealMs(null)
    setSynonymWarn(false)
    setReadingWarn(false)
    setKanjiWarn(false)
    setLatinWarn(false)
  }

  async function onUndoJudgementFromHeader() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    setPendingIncorrectDelay(false)

    const undone = await undoLastJudgement()
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
    setKanjiWarn(false)
    setLatinWarn(false)
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

  if (loading) return <div className="page review">Loading queue…</div>

  if (!current) {
    const backTo = deckId ? `/decks/${deckId}` : "/"
    if (hadDueItemsRef.current) {
      return (
        <ReviewSessionComplete
          backTo={backTo}
          onUndoLastJudgement={() => void onUndoJudgementFromHeader()}
        />
      )
    }
    return (
      <div className="page review">
        <header className="header review-header">
          <Link to={backTo} className="back-link" aria-label="Exit review">
            <ChevronLeftIcon className="back-chevron" />
          </Link>
          <div className="review-header-menu">
            <UserMenu />
          </div>
        </header>
        <p className="muted">Nothing due right now.</p>
        <div className="toolbar">
          <button
            type="button"
            className="btn secondary"
            onClick={() => void onUndoJudgementFromHeader()}
          >
            Undo last judgement
          </button>
        </div>
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
        <Link
          to={deckId ? `/decks/${deckId}` : "/"}
          className="back-link"
          aria-label="Exit review"
        >
          <ChevronLeftIcon className="back-chevron" />
        </Link>
        <div className="review-header-menu">
          <p className="muted small">{sessionQueue.length} remaining</p>
          <UserMenu />
        </div>
        <div className="review-header-actions">
          <Link
            to={`/decks/${item.card.deckId}/cards/${encodeURIComponent(item.card.id)}?returnTo=${encodeURIComponent(
              reviewReturnTo,
            )}`}
            className="btn secondary"
          >
            Edit card
          </Link>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void onUndoJudgementFromHeader()}
          >
            Undo last judgement
          </button>
        </div>
      </header>

      <section className="panel prompt">
        {modeLabel && <h2 className="sr-only">{modeLabel}</h2>}

        {pendingIncorrectDelay ? (
          <p className="muted small">Next card…</p>
        ) : (
          <div className="review-columns">
            <div className="review-question">
              <div className="review-question-content">
                <ReviewSessionPromptBody
                  item={item}
                  typed={typed}
                  onTypedChange={handleTypedChange}
                  readingWarn={readingWarn}
                  synonymWarn={synonymWarn}
                  kanjiWarn={kanjiWarn}
                  latinWarn={latinWarn}
                  onTypedSubmit={() => tryShowAnswerRef.current()}
                  revealed={phase === "answer"}
                  column="question"
                  promptFocusToken={promptFocusToken}
                />
              </div>
              {/* Invisible twin of `.review-footer` — reserves the same
                  space the answer card's real footer takes, so this card's
                  text centers at the same height as the answer's. */}
              <ReviewFooter className="review-question-footer-spacer" aria-hidden>
                <span className="btn">Show answer</span>
              </ReviewFooter>
            </div>
            <div className="review-answer">
              {/* Both layers stay mounted throughout — revealing the answer
                  fades the answer layer in over the prompt layer rather than
                  swapping them, so the card never has to resize. */}
              <div
                className="review-answer-stack"
                key={`${item.card.id}:${item.modeId}`}
              >
                <div
                  className={`review-answer-prompt${phase === "answer" ? " is-hidden" : ""}`}
                  aria-hidden={phase === "answer"}
                  {...inertWhen(phase === "answer")}
                >
                  <ReviewSessionPromptBody
                    item={item}
                    typed={typed}
                    onTypedChange={handleTypedChange}
                    readingWarn={readingWarn}
                    synonymWarn={synonymWarn}
                    kanjiWarn={kanjiWarn}
                    latinWarn={latinWarn}
                    onTypedSubmit={() => tryShowAnswerRef.current()}
                    column="answer"
                    promptFocusToken={promptFocusToken}
                  />
                  <ReviewFooter>
                    <button
                      ref={showAnswerBtnRef}
                      type="button"
                      className="btn primary"
                      onClick={() => tryShowAnswerRef.current()}
                    >
                      Show answer
                    </button>
                  </ReviewFooter>
                </div>

                <div
                  className={`review-answer-revealed${phase === "answer" ? " is-visible" : ""}`}
                  aria-hidden={phase !== "answer"}
                  {...inertWhen(phase !== "answer")}
                >
                  <ReviewSessionAnswerPanel
                    item={item}
                    typed={typed}
                    expected={exp}
                    pendingIncorrectDelay={pendingIncorrectDelay}
                    onJudge={(correct) => void onJudge(correct)}
                    onUndoAnswer={() => void onUndoAnswer()}
                    active={phase === "answer"}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

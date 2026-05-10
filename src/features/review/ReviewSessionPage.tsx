import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Link, useParams } from "react-router-dom"
import type { Card, ReviewModeId } from "../../domain/types"
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
import { RubySentence, RubyWord } from "../../ui/KanjiRuby"
import { CardImage } from "../../ui/CardImage"
import { TextDiffCompare } from "../../ui/TextDiffCompare"
import { hasNonHiraganaKana } from "../../lib/japanese/normalize"
import {
  isSynonymAnswer,
  matchesPrimaryJapanese,
} from "../../lib/japanese/synonyms"

const INCORRECT_ADVANCE_DELAY_MS = 550

function readingForConstruction(
  construction: string,
  readings: Record<string, string>,
): string | undefined {
  const keys = Object.keys(readings).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (construction.includes(k) && readings[k]?.trim()) return readings[k]
  }
  return undefined
}

function requiresTyping(mode: ReviewModeId): boolean {
  return (
    mode === "vocab_type_reading" ||
    mode === "vocab_type_word_from_clue" ||
    mode === "grammar_type_construction"
  )
}

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
    const m = current.modeId
    const labels: Record<ReviewModeId, string> = {
      vocab_oral_en: "Say the English meaning",
      vocab_type_reading: "Type the reading (hiragana)",
      vocab_type_word_from_clue: "Type the Japanese word",
      grammar_type_construction: "Type the construction",
      grammar_oral_meaning: "Say the English meaning of the construction",
    }
    return labels[m]
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

  function expectedAnswer(card: Card, mode: ReviewModeId): string {
    if (mode === "vocab_type_reading")
      return card.kind === "vocabulary" ? card.content.reading ?? "" : ""
    if (mode === "vocab_type_word_from_clue")
      return card.kind === "vocabulary" ? card.content.wordJa : ""
    if (mode === "grammar_type_construction")
      return card.kind === "grammar" ? card.content.construction : ""
    return ""
  }

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

    if (delayMs === 0) {
      resetPromptAfterJudgement()
      setPhase("prompt")
      return
    }

    setPendingIncorrectDelay(true)
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null
      setPendingIncorrectDelay(false)
      resetPromptAfterJudgement()
      setPhase("prompt")
    }, delayMs)
  }

  async function onUndoAnswer() {
    if (snapshot) await restoreSchedulingSnapshot(snapshot, user)
    setPhase("prompt")
    setSnapshot(null)
  }

  async function onUndoJudgementFromHeader() {
    const undone = await undoLastJudgement(user)
    if (undone) {
      setSessionQueue((q) => [undone, ...q])
    }
    setPhase("prompt")
    setTyped("")
    setSnapshot(null)
    setSynonymWarn(false)
    setReadingWarn(false)
    setPendingIncorrectDelay(false)
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }

  const typingMode = current ? requiresTyping(current.modeId) : false

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

  const c = current.card
  const m = current.modeId
  const exp = expectedAnswer(c, m)

  return (
    <div className="page review">
      <header className="header review-header">
        <Link to={deckId ? `/decks/${deckId}` : "/"}>← Exit</Link>
        <div className="review-header-main">
          <p className="muted small">
            {sessionQueue.length} left · {m}
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
            {m === "vocab_oral_en" && c.kind === "vocabulary" && (
              <div className="stack">
                <p className="prompt-main">
                  <RubyWord
                    surface={c.content.wordJa}
                    reading={c.content.reading}
                  />
                </p>
                {c.content.exampleSentences[0] && (
                  <p className="muted">{c.content.exampleSentences[0]}</p>
                )}
              </div>
            )}

            {m === "vocab_type_reading" && c.kind === "vocabulary" && (
              <div className="stack">
                <p className="prompt-main">{c.content.wordJa}</p>
                {c.content.exampleSentences[0] && (
                  <p className="muted">{c.content.exampleSentences[0]}</p>
                )}
                <input
                  className="input"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    tryShowAnswerRef.current()
                  }}
                  placeholder="ひらがなで"
                  autoComplete="off"
                />
                {readingWarn && (
                  <p className="error">
                    Use hiragana only for readings (no kanji or katakana).
                  </p>
                )}
              </div>
            )}

            {m === "vocab_type_word_from_clue" && c.kind === "vocabulary" && (
              <div className="stack">
                <ul>
                  {c.content.definitionsEn
                    .filter((s) => s.trim())
                    .map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                </ul>
                {c.content.images.map((id) => (
                  <CardImage key={id} mediaId={id} />
                ))}
                <input
                  className="input"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    tryShowAnswerRef.current()
                  }}
                  placeholder="Japanese word"
                />
                {synonymWarn && (
                  <p className="warn">
                    That matches a synonym — try the main form on the card.
                  </p>
                )}
              </div>
            )}

            {m === "grammar_type_construction" && c.kind === "grammar" && (
              <div className="stack">
                <RubySentence
                  sentence={c.content.sentenceWithGap}
                  gapMarker={c.content.gapMarker}
                  readings={c.content.readings}
                />
                <p className="muted">{c.content.translationEn}</p>
                <input
                  className="input"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    tryShowAnswerRef.current()
                  }}
                  placeholder="Construction"
                />
                {synonymWarn && (
                  <p className="warn">
                    That matches a synonym — try the construction written on the
                    card.
                  </p>
                )}
              </div>
            )}

            {m === "grammar_oral_meaning" && c.kind === "grammar" && (
              <div className="stack">
                <p className="prompt-main">
                  <RubyWord
                    surface={c.content.construction}
                    reading={readingForConstruction(
                      c.content.construction,
                      c.content.readings,
                    )}
                  />
                </p>
              </div>
            )}

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
          <div className="answer-block stack">
            <h3>Answer</h3>
            {typingMode && (
              <TextDiffCompare typed={typed} expected={exp} />
            )}
            {m === "vocab_oral_en" && c.kind === "vocabulary" && (
              <ul>
                {c.content.definitionsEn
                  .filter((s) => s.trim())
                  .map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
              </ul>
            )}
            {m === "grammar_oral_meaning" && c.kind === "grammar" && (
              <p>{c.content.translationEn}</p>
            )}
            <div className="toolbar">
              <button
                type="button"
                className="btn good"
                disabled={pendingIncorrectDelay}
                onClick={() => void onJudge(true)}
              >
                Correct
              </button>
              <button
                type="button"
                className="btn bad"
                disabled={pendingIncorrectDelay}
                onClick={() => void onJudge(false)}
              >
                Incorrect
              </button>
              {typingMode && (
                <button
                  type="button"
                  className="btn"
                  disabled={pendingIncorrectDelay}
                  onClick={() => void onUndoAnswer()}
                >
                  Undo answer
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

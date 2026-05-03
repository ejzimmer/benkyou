import { useCallback, useEffect, useMemo, useState } from "react"
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
import { hasNonHiraganaKana } from "../../lib/japanese/normalize"
import {
  isSynonymAnswer,
  matchesPrimaryJapanese,
} from "../../lib/japanese/synonyms"

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

type Phase = "prompt" | "answer"

export function ReviewSessionPage() {
  const { deckId } = useParams()
  const { user } = useAuth()
  const [queue, setQueue] = useState<DueItem[]>([])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>("prompt")
  const [typed, setTyped] = useState("")
  const [synonymWarn, setSynonymWarn] = useState(false)
  const [readingWarn, setReadingWarn] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [snapshot, setSnapshot] = useState<JudgementSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const all = await prefetchDueForSession()
    const q = deckId
      ? all.filter((x) => x.card.deckId === deckId)
      : all
    setQueue(q)
    setIdx(0)
    setPhase("prompt")
    setTyped("")
    setSynonymWarn(false)
    setReadingWarn(false)
    setStartedAt(null)
    setSnapshot(null)
    setLoading(false)
  }, [deckId])

  useEffect(() => {
    load()
  }, [load])

  const current = queue[idx]

  useEffect(() => {
    if (current && phase === "prompt") {
      setStartedAt(performance.now())
    }
  }, [current, phase])

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

  async function onShowAnswer() {
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

  function expectedAnswer(c: Card, m: ReviewModeId): string {
    if (m === "vocab_type_reading") return c.kind === "vocabulary" ? c.content.reading ?? "" : ""
    if (m === "vocab_type_word_from_clue")
      return c.kind === "vocabulary" ? c.content.wordJa : ""
    if (m === "grammar_type_construction")
      return c.kind === "grammar" ? c.content.construction : ""
    return ""
  }

  async function onJudge(correct: boolean) {
    if (!current) return
    const ms =
      startedAt != null ? Math.round(performance.now() - startedAt) : null
    await commitJudgement(
      current.card.id,
      current.modeId,
      ms,
      correct,
      snapshot,
      user,
    )
    setIdx((i) => i + 1)
    setPhase("prompt")
    setTyped("")
    setSynonymWarn(false)
    setReadingWarn(false)
    setStartedAt(null)
    setSnapshot(null)
  }

  async function onUndoAnswer() {
    if (snapshot) await restoreSchedulingSnapshot(snapshot, user)
    setPhase("prompt")
    setSnapshot(null)
  }

  async function onUndoJudgement() {
    await undoLastJudgement(user)
    setIdx((i) => Math.max(0, i - 1))
    setPhase("prompt")
    setTyped("")
    setSnapshot(null)
  }

  function checkSubmitTyped(): boolean {
    if (!current) return true
    const c = current.card
    const m = current.modeId
    if (m === "vocab_type_word_from_clue" || m === "grammar_type_construction") {
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

  if (loading) return <div className="page">Loading queue…</div>

  if (!current) {
    return (
      <div className="page">
        <header className="header">
          <Link to={deckId ? `/decks/${deckId}` : "/"}>← Back</Link>
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

  return (
    <div className="page review">
      <header className="header">
        <Link to={deckId ? `/decks/${deckId}` : "/"}>← Exit</Link>
        <p className="muted small">
          Card {idx + 1} / {queue.length} · {m}
        </p>
      </header>

      <section className="panel prompt">
        <h2>{modeLabel}</h2>

        {m === "vocab_oral_en" && c.kind === "vocabulary" && (
          <div className="stack">
            <p className="prompt-main">
              <RubyWord surface={c.content.wordJa} reading={c.content.reading} />
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
              {c.content.definitionsEn.filter((s) => s.trim()).map((d, i) => (
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
              placeholder="Construction"
            />
            {synonymWarn && (
              <p className="warn">
                That matches a synonym — try the construction written on the card.
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

        {phase === "prompt" && (
          <div className="toolbar">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if (!checkSubmitTyped()) return
                void onShowAnswer()
              }}
            >
              Show answer
            </button>
          </div>
        )}

        {phase === "answer" && (
          <div className="answer-block stack">
            <h3>Answer</h3>
            {(m === "vocab_type_reading" ||
              m === "vocab_type_word_from_clue" ||
              m === "grammar_type_construction") && (
              <div className="compare">
                <div>
                  <strong>Yours</strong>
                  <p>{typed || "—"}</p>
                </div>
                <div>
                  <strong>Card</strong>
                  <p>{expectedAnswer(c, m)}</p>
                </div>
              </div>
            )}
            {m === "vocab_oral_en" && c.kind === "vocabulary" && (
              <ul>
                {c.content.definitionsEn.filter((s) => s.trim()).map((d, i) => (
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
                onClick={() => void onJudge(true)}
              >
                Correct
              </button>
              <button
                type="button"
                className="btn bad"
                onClick={() => void onJudge(false)}
              >
                Incorrect
              </button>
              <button type="button" className="btn" onClick={() => void onUndoAnswer()}>
                Undo answer
              </button>
              <button type="button" className="btn" onClick={() => void onUndoJudgement()}>
                Undo last judgement
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

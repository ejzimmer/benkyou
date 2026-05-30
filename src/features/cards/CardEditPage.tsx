import { useEffect, useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  Link,
  useMatch,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import type {
  Card,
  GrammarCardContent,
  VocabularyCardContent,
} from "../../domain/types"
import { containsKanji } from "../../domain/types"
import { isKanaOnly } from "../../domain/vocabularyContent"
import {
  createGrammarCard,
  createVocabularyCard,
  defaultGrammar,
  defaultVocabulary,
  saveCard,
  validateGrammar,
  validateVocabulary,
} from "../../services/cards"
import { saveImageBlob } from "../../services/media"
import { useAuth } from "../../lib/auth/AuthContext"
import { db } from "../../lib/db/schema"
import {
  grammarReadingsToText,
  parseGrammarReadingsText,
} from "../../domain/grammarReadings"

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null
  return raw
}

export function CardEditPage() {
  const { deckId = "", cardId: cardIdParam = "" } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isNewRoute = useMatch({ path: "/decks/:deckId/cards/new", end: true })
  const cardId = cardIdParam ? decodeURIComponent(cardIdParam) : ""
  const isNew = Boolean(isNewRoute) || cardId === "new" || !cardId
  const vocabNew = searchParams.get("vocab") !== "0"
  const returnTo = safeReturnTo(searchParams.get("returnTo"))
  const backTo = returnTo ?? `/decks/${deckId}`

  const loadedCard = useLiveQuery(
    async () => {
      if (isNew || !cardId) return null
      return (await db.cards.get(cardId)) ?? null
    },
    [cardId, isNew],
  )

  const [loading, setLoading] = useState(!isNew)
  const [kind, setKind] = useState<"vocabulary" | "grammar">(
    vocabNew ? "vocabulary" : "grammar",
  )
  const [vocab, setVocab] = useState<VocabularyCardContent>(defaultVocabulary)
  const [grammar, setGrammar] = useState<GrammarCardContent>(defaultGrammar)
  /** Controlled draft so incomplete `kanji=` lines are not dropped on each keystroke */
  const [readingsMapDraft, setReadingsMapDraft] = useState("")
  const prevKind = useRef(kind)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setErr(null)
      setReadingsMapDraft("")
      return
    }
    if (loadedCard === undefined) {
      setLoading(true)
      return
    }
    setLoading(false)
    if (!loadedCard || loadedCard.deckId !== deckId) {
      setErr("Card not found")
      return
    }
    setErr(null)
    setKind(loadedCard.kind)
    if (loadedCard.kind === "vocabulary") {
      setVocab(loadedCard.content)
      setReadingsMapDraft("")
    } else {
      setGrammar(loadedCard.content)
      setReadingsMapDraft(grammarReadingsToText(loadedCard.content.readings))
    }
  }, [cardId, deckId, isNew, loadedCard])

  useEffect(() => {
    if (!isNew) return
    if (prevKind.current !== kind && kind === "grammar") {
      setReadingsMapDraft(grammarReadingsToText(grammar.readings))
    }
    prevKind.current = kind
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset draft when switching TO grammar, not when readings change from typing
  }, [isNew, kind])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      if (kind === "vocabulary") {
        const emsg = validateVocabulary(vocab)
        if (emsg) throw new Error(emsg)
        if (isNew) {
          await createVocabularyCard(deckId, vocab, user)
        } else {
          const card: Card = {
            id: cardId!,
            deckId,
            kind: "vocabulary",
            content: vocab,
            updatedAt: Date.now(),
          }
          await saveCard(card, user)
        }
      } else {
        const emsg = validateGrammar(grammar)
        if (emsg) throw new Error(emsg)
        if (isNew) {
          await createGrammarCard(deckId, grammar, user)
        } else {
          const card: Card = {
            id: cardId!,
            deckId,
            kind: "grammar",
            content: grammar,
            updatedAt: Date.now(),
          }
          await saveCard(card, user)
        }
      }
      navigate(returnTo ?? `/decks/${deckId}`)
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Save failed")
    }
  }

  async function onPickImage(files: FileList | null) {
    if (!files?.length) return
    const id = await saveImageBlob(files[0], user)
    if (kind === "vocabulary") {
      setVocab((v) => ({ ...v, images: [...v.images, id] }))
    } else {
      setGrammar((g) => ({ ...g, images: [...g.images, id] }))
    }
  }

  if (loading) return <div className="page">Loading…</div>

  return (
    <div className="page">
      <header className="header">
        <Link to={backTo}>{returnTo ? "← Back" : "← Deck"}</Link>
        <h1>{isNew ? "New card" : "Edit card"}</h1>
      </header>

      <form onSubmit={onSubmit} className="panel stack">
        {isNew && (
          <label className="row">
            Type{" "}
            <select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "vocabulary" | "grammar")
              }
            >
              <option value="vocabulary">Vocabulary</option>
              <option value="grammar">Grammar</option>
            </select>
          </label>
        )}

        {kind === "vocabulary" ? (
          <>
            <label>
              Japanese word
              <input
                className="input"
                value={vocab.wordJa}
                onChange={(e) => {
                  const wordJa = e.target.value
                  setVocab({
                    ...vocab,
                    wordJa,
                    reading: isKanaOnly(wordJa) ? undefined : vocab.reading,
                  })
                }}
                required
              />
            </label>
            <label>
              Reading / pronunciation (hiragana — kanji words only)
              <input
                className="input"
                value={vocab.reading ?? ""}
                disabled={isKanaOnly(vocab.wordJa)}
                onChange={(e) =>
                  setVocab({ ...vocab, reading: e.target.value })
                }
              />
            </label>
            {!containsKanji(vocab.wordJa) && (
              <p className="muted small">
                Kana-only words do not use a separate pronunciation field.
              </p>
            )}
            <p className="muted small">
              Include at least one of: pronunciation (for kanji words), English
              meaning, or an image.
            </p>
            <label>
              English definitions (one per line)
              <textarea
                className="input"
                rows={4}
                value={vocab.definitionsEn.join("\n")}
                onChange={(e) =>
                  setVocab({
                    ...vocab,
                    definitionsEn: e.target.value.split("\n"),
                  })
                }
              />
            </label>
            <label>
              Example sentences (one per line)
              <textarea
                className="input"
                rows={3}
                value={vocab.exampleSentences.join("\n")}
                onChange={(e) =>
                  setVocab({
                    ...vocab,
                    exampleSentences: e.target.value.split("\n"),
                  })
                }
              />
            </label>
            <label>
              Synonyms in Japanese (one per line)
              <textarea
                className="input"
                rows={2}
                value={vocab.synonymsJa.join("\n")}
                onChange={(e) =>
                  setVocab({
                    ...vocab,
                    synonymsJa: e.target.value.split("\n"),
                  })
                }
              />
            </label>
            <label>
              Images
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickImage(e.target.files)}
              />
            </label>
            <ul className="muted small">
              {vocab.images.map((id) => (
                <li key={id}>{id.slice(0, 8)}…</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <label>
              Sentence with gap (include marker)
              <input
                className="input"
                value={grammar.sentenceWithGap}
                onChange={(e) =>
                  setGrammar({ ...grammar, sentenceWithGap: e.target.value })
                }
              />
            </label>
            <label>
              Gap marker
              <input
                className="input"
                value={grammar.gapMarker}
                onChange={(e) =>
                  setGrammar({ ...grammar, gapMarker: e.target.value })
                }
              />
            </label>
            <label>
              Construction (fills gap)
              <input
                className="input"
                value={grammar.construction}
                onChange={(e) =>
                  setGrammar({ ...grammar, construction: e.target.value })
                }
              />
            </label>
            <label>
              English translation
              <input
                className="input"
                value={grammar.translationEn}
                onChange={(e) =>
                  setGrammar({ ...grammar, translationEn: e.target.value })
                }
              />
            </label>
            <label>
              Readings map (format: kanjiPhrase=reading, one per line)
              <textarea
                className="input"
                rows={4}
                aria-label="Kanji to reading map"
                value={readingsMapDraft}
                onChange={(e) => {
                  const text = e.target.value
                  setReadingsMapDraft(text)
                  setGrammar((g) => ({
                    ...g,
                    readings: parseGrammarReadingsText(text),
                  }))
                }}
              />
            </label>
            <label>
              Synonyms (Japanese, one per line)
              <textarea
                className="input"
                rows={2}
                value={grammar.synonymsJa.join("\n")}
                onChange={(e) =>
                  setGrammar({
                    ...grammar,
                    synonymsJa: e.target.value.split("\n"),
                  })
                }
              />
            </label>
            <label>
              Images
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickImage(e.target.files)}
              />
            </label>
          </>
        )}

        {err && <p className="error">{err}</p>}
        <button type="submit" className="btn primary">
          Save
        </button>
      </form>
    </div>
  )
}

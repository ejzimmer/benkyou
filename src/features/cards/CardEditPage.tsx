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
import { CARD_KIND_LABELS, containsKanji } from "../../domain/types"
import { countGaps } from "../../domain/grammarGaps"
import { isKanaOnly } from "../../domain/vocabularyContent"
import {
  createGrammarCard,
  createVocabularyCard,
  defaultGrammar,
  defaultVocabulary,
  deleteCard,
  grammarFromVocabularyContent,
  mergeCards,
  normalizeGrammarContent,
  saveCard,
  validateGrammar,
  validateVocabulary,
  vocabularyFromGrammarContent,
} from "../../services/cards"
import { saveImageBlob } from "../../services/media"
import { useAuth } from "../../lib/auth/AuthContext"
import { db } from "../../lib/db/schema"
import { CardImage } from "../../ui/CardImage"
import { normalizeJapanese } from "../../lib/japanese/normalize"
import { findDuplicateCards, japaneseWordForCard } from "../../domain/duplicates"
import { DuplicateCardsModal } from "./DuplicateCardsModal"
import { ConfirmModal } from "../../ui/ConfirmModal"
import {
  grammarReadingsToText,
  parseGrammarReadingsText,
} from "../../domain/grammarReadings"

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null
  return raw
}

function imageFilesFromClipboard(data: DataTransfer): File[] {
  const itemFiles = Array.from(data.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)

  if (itemFiles.length > 0) return itemFiles

  return Array.from(data.files).filter((file) => file.type.startsWith("image/"))
}

function ImagePreviewList({ imageIds }: { imageIds: string[] }) {
  if (imageIds.length === 0) return null

  return (
    <div className="image-preview-list">
      {imageIds.map((id) => (
        <CardImage key={id} mediaId={id} />
      ))}
    </div>
  )
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
  const formRef = useRef<HTMLFormElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [imageUploadCount, setImageUploadCount] = useState(0)
  const isUploadingImages = imageUploadCount > 0

  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<Card[]>([])
  const [mergingId, setMergingId] = useState<string | null>(null)
  const [mergeErr, setMergeErr] = useState<string | null>(null)

  const duplicateJapaneseCards = useLiveQuery(
    async () => {
      if (!isNew) return []
      const currentJapanese =
        kind === "vocabulary" ? vocab.wordJa : grammar.construction
      const normalizedCurrentJapanese = normalizeJapanese(currentJapanese)
      if (!normalizedCurrentJapanese) return []
      const cards = await db.cards.toArray()
      return cards.filter(
        (card) =>
          normalizeJapanese(japaneseWordForCard(card)) ===
          normalizedCurrentJapanese,
      )
    },
    [isNew, kind, vocab.wordJa, grammar.construction],
  )

  const duplicateJapaneseWarning =
    isNew && duplicateJapaneseCards?.length
      ? (() => {
          const count = duplicateJapaneseCards.length
          const fieldName =
            kind === "vocabulary" ? "Japanese word" : "construction"
          const deckScope = duplicateJapaneseCards.some(
            (card) => card.deckId !== deckId,
          )
            ? ", including in another deck"
            : " in this deck"
          return `Warning: ${count} existing card${
            count === 1 ? "" : "s"
          } already ${count === 1 ? "has" : "have"} the same ${fieldName}${deckScope}. You can still save this duplicate card.`
        })()
      : null

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

  function resetNewCardForm() {
    setVocab(defaultVocabulary())
    setGrammar(defaultGrammar())
    setReadingsMapDraft("")
    formRef.current?.reset()
  }

  function currentCardDraft(): Card {
    return kind === "vocabulary"
      ? { id: cardId, deckId, kind: "vocabulary", content: vocab, updatedAt: Date.now() }
      : { id: cardId, deckId, kind: "grammar", content: grammar, updatedAt: Date.now() }
  }

  function onKindChange(nextKind: "vocabulary" | "grammar") {
    if (nextKind === kind) return

    if (nextKind === "vocabulary") {
      setVocab(vocabularyFromGrammarContent(grammar))
      setKind("vocabulary")
      return
    }

    const nextGrammar = grammarFromVocabularyContent(vocab)
    setGrammar(nextGrammar)
    setReadingsMapDraft(grammarReadingsToText(nextGrammar.readings))
    setKind("grammar")
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      if (kind === "vocabulary") {
        const emsg = validateVocabulary(vocab)
        if (emsg) throw new Error(emsg)
        if (isNew) {
          await createVocabularyCard(deckId, vocab, user)
          resetNewCardForm()
          return
        } else {
          await saveCard(currentCardDraft(), user)
        }
      } else {
        const normalizedGrammar = normalizeGrammarContent(grammar)
        const emsg = validateGrammar(normalizedGrammar)
        if (emsg) throw new Error(emsg)
        if (isNew) {
          await createGrammarCard(deckId, normalizedGrammar, user)
          resetNewCardForm()
          return
        } else {
          await saveCard(
            {
              id: cardId,
              deckId,
              kind: "grammar",
              content: normalizedGrammar,
              updatedAt: Date.now(),
            },
            user,
          )
        }
      }
      navigate(returnTo ?? `/decks/${deckId}`)
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Save failed")
    }
  }

  function onDeleteCard() {
    setConfirmingDelete(true)
  }

  function onConfirmDeleteCard() {
    setConfirmingDelete(false)
    navigate(returnTo ?? `/decks/${deckId}`)
    deleteCard(cardId, user).catch(console.error)
  }

  async function onFindDuplicates() {
    setMergeErr(null)
    const allCards = await db.cards.toArray()
    setDuplicateMatches(findDuplicateCards(currentCardDraft(), allCards))
    setShowDuplicatesModal(true)
  }

  async function onMergeDuplicate(match: Card) {
    setMergeErr(null)
    setMergingId(match.id)
    try {
      const merged = await mergeCards(currentCardDraft(), match, user)
      if (merged.kind === "vocabulary") {
        setVocab(merged.content)
      } else {
        setGrammar(merged.content)
        setReadingsMapDraft(grammarReadingsToText(merged.content.readings))
      }
      setDuplicateMatches((matches) => matches.filter((c) => c.id !== match.id))
    } catch (x) {
      setMergeErr(x instanceof Error ? x.message : "Merge failed")
    } finally {
      setMergingId(null)
    }
  }

  async function addImageFiles(files: File[]) {
    if (files.length === 0) return

    setErr(null)
    setImageUploadCount((count) => count + files.length)
    const ids: string[] = []
    try {
      for (const file of files) {
        ids.push(await saveImageBlob(file, user))
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Image upload failed")
    } finally {
      setImageUploadCount((count) => Math.max(0, count - files.length))
    }

    if (ids.length === 0) return

    if (kind === "vocabulary") {
      setVocab((v) => ({ ...v, images: [...v.images, ...ids] }))
    } else {
      setGrammar((g) => ({ ...g, images: [...g.images, ...ids] }))
    }
  }

  async function onPickImage(files: FileList | null) {
    if (!files?.length) return
    await addImageFiles(
      Array.from(files).filter((file) => file.type.startsWith("image/")),
    )
  }

  function onPaste(e: React.ClipboardEvent<HTMLFormElement>) {
    const files = imageFilesFromClipboard(e.clipboardData)
    if (files.length === 0) return

    e.preventDefault()
    void addImageFiles(files)
  }

  if (loading) return <div className="page">Loading…</div>

  return (
    <div className="page">
      <header className="header">
        <Link to={backTo}>{returnTo ? "← Back" : "← Deck"}</Link>
        <h1>{isNew ? "New card" : "Edit card"}</h1>
        {!isNew && (
          <button type="button" className="btn" onClick={onFindDuplicates}>
            Find duplicate cards
          </button>
        )}
        {!isNew && (
          <button type="button" className="btn danger" onClick={onDeleteCard}>
            Delete card
          </button>
        )}
      </header>

      {showDuplicatesModal && (
        <DuplicateCardsModal
          matches={duplicateMatches}
          mergingId={mergingId}
          error={mergeErr}
          onMerge={onMergeDuplicate}
          onClose={() => setShowDuplicatesModal(false)}
        />
      )}

      {confirmingDelete && (
        <ConfirmModal
          message="Delete this card?"
          onConfirm={onConfirmDeleteCard}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <form
        ref={formRef}
        onSubmit={onSubmit}
        onPaste={onPaste}
        className="panel stack"
        aria-label="Card editor"
      >
        <label className="row">
          Type{" "}
          <select
            value={kind}
            onChange={(e) =>
              onKindChange(e.target.value as "vocabulary" | "grammar")
            }
          >
            <option value="vocabulary">{CARD_KIND_LABELS.vocabulary}</option>
            <option value="grammar">{CARD_KIND_LABELS.grammar}</option>
          </select>
        </label>

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
              Include at least one of: pronunciation (for kanji words),
              meaning, or an image.
            </p>
            {duplicateJapaneseWarning && (
              <p className="warn small" role="status">
                {duplicateJapaneseWarning}
              </p>
            )}
            <label>
              Meaning (one per line)
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
                onChange={(e) => {
                  void onPickImage(e.currentTarget.files)
                  e.currentTarget.value = ""
                }}
              />
            </label>
            <p className="muted small">
              Choose an image file or paste an image from your clipboard
              anywhere in this form.
            </p>
            <ImagePreviewList imageIds={vocab.images} />
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
            {countGaps(grammar.sentenceWithGap, grammar.gapMarker) > 1 && (
              <p className="muted small">
                This sentence has{" "}
                {countGaps(grammar.sentenceWithGap, grammar.gapMarker)} gaps —
                separate the answers with a comma (, or 、), in order, e.g.
                “が, の”.
              </p>
            )}
            {duplicateJapaneseWarning && (
              <p className="warn small" role="status">
                {duplicateJapaneseWarning}
              </p>
            )}
            <label>
              Translation
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
                onChange={(e) => {
                  void onPickImage(e.currentTarget.files)
                  e.currentTarget.value = ""
                }}
              />
            </label>
            <p className="muted small">
              Choose an image file or paste an image from your clipboard
              anywhere in this form.
            </p>
            <ImagePreviewList imageIds={grammar.images} />
          </>
        )}

        {isUploadingImages && (
          <p className="muted small" aria-live="polite">
            {imageUploadCount === 1
              ? "Adding image…"
              : `Adding ${imageUploadCount} images…`}
          </p>
        )}
        {err && <p className="error">{err}</p>}
        <button type="submit" className="btn primary" disabled={isUploadingImages}>
          Save
        </button>
      </form>
    </div>
  )
}

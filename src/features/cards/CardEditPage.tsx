import { useEffect, useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
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
import { CARD_KIND_LABELS } from "../../domain/types"
import { countGaps, detectGapMarker } from "../../domain/grammarGaps"
import { isKanaOnly } from "../../domain/vocabularyContent"
import { isSingleSided } from "../../domain/grammarContent"
import {
  createGrammarCard,
  createVocabularyCard,
  defaultGrammar,
  defaultVocabulary,
  deleteCard,
  grammarFromVocabularyContent,
  isMediaReferencedByOtherCards,
  mergeCards,
  normalizeGrammarContent,
  saveCard,
  validateGrammar,
  validateVocabulary,
  vocabularyFromGrammarContent,
} from "../../services/cards"
import { deleteImageBlob, saveImageBlob } from "../../services/media"
import { db } from "../../lib/db/schema"
import { CardImage } from "../../ui/CardImage"
import { normalizeJapanese } from "../../lib/japanese/normalize"
import { findDuplicateCards, japaneseWordForCard } from "../../domain/duplicates"
import { DuplicateCardsModal } from "./DuplicateCardsModal"
import { ConfirmModal } from "../../ui/ConfirmModal"
import { PageHeading } from "../../ui/PageHeading"
import { UserMenu } from "../../ui/UserMenu"
import { SyncButton } from "../../ui/SyncButton"
import { LabeledToggle } from "../../ui/LabeledToggle"
import { Switch } from "../../ui/Switch"
import {
  addMissingKanjiLines,
  parseReadingsMapText,
  readingsMapToText,
} from "../../domain/readingsMap"

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

function ImagePreviewList({
  imageIds,
  onRemove,
  onAdd,
}: {
  imageIds: string[]
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="image-preview-list">
      {imageIds.map((id) => (
        <div key={id} className="image-preview-item">
          <CardImage mediaId={id} />
          <button
            type="button"
            className="image-preview-remove"
            aria-label="Remove image"
            onClick={() => onRemove(id)}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="image-preview-add"
        onClick={onAdd}
        aria-label="Add image"
      >
        <span
          className="btn secondary icon add-card-btn image-preview-add-icon"
          aria-hidden="true"
        >
          +
        </span>
      </button>
    </div>
  )
}

export function CardEditPage() {
  const { deckId = "", cardId: cardIdParam = "" } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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
  /** Controlled draft so incomplete `kanji=` lines are not dropped on each
   * keystroke — shared by both card kinds' Furigana field. */
  const [furiganaDraft, setFuriganaDraft] = useState("")
  const formRef = useRef<HTMLFormElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [imageUploadCount, setImageUploadCount] = useState(0)
  const isUploadingImages = imageUploadCount > 0

  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<Card[]>([])
  const [mergingId, setMergingId] = useState<string | null>(null)
  const [mergeErr, setMergeErr] = useState<string | null>(null)

  const currentJapanese = kind === "vocabulary" ? vocab.wordJa : grammar.construction
  const normalizedCurrentJapanese = normalizeJapanese(currentJapanese)

  // useLiveQuery resolves asynchronously, so its result can still reflect a
  // previously-typed word for a render or two after the field itself has
  // moved on (e.g. cleared by resetNewCardForm() on save, or replaced by a
  // paste). Tagging each result with the word it was computed for lets the
  // read below detect and ignore a stale result rather than trusting
  // whatever the query last returned.
  const duplicateJapaneseCheck = useLiveQuery(
    async () => {
      if (!isNew || !normalizedCurrentJapanese) {
        return { forWord: normalizedCurrentJapanese, cards: [] as Card[] }
      }
      const cards = await db.cards.toArray()
      return {
        forWord: normalizedCurrentJapanese,
        cards: cards.filter(
          (card) =>
            normalizeJapanese(japaneseWordForCard(card)) ===
            normalizedCurrentJapanese,
        ),
      }
    },
    [isNew, normalizedCurrentJapanese],
  )

  const duplicateJapaneseCards =
    duplicateJapaneseCheck?.forWord === normalizedCurrentJapanese
      ? duplicateJapaneseCheck.cards
      : undefined

  const duplicateJapaneseWarning =
    isNew && normalizedCurrentJapanese && duplicateJapaneseCards?.length
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

  // Tracks which cardId the form has already been hydrated from, so that
  // live-query emissions caused by unrelated writes to this row (e.g. a
  // background sync pass rewriting the card) don't clobber in-progress edits.
  const hydratedCardIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setErr(null)
      setFuriganaDraft("")
      hydratedCardIdRef.current = null
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
    if (hydratedCardIdRef.current === cardId) return
    hydratedCardIdRef.current = cardId
    setKind(loadedCard.kind)
    if (loadedCard.kind === "vocabulary") {
      setVocab(loadedCard.content)
      setFuriganaDraft(readingsMapToText(loadedCard.content.readings ?? {}))
    } else {
      setGrammar({
        ...loadedCard.content,
        singleSided: isSingleSided(loadedCard.content),
      })
      setFuriganaDraft(readingsMapToText(loadedCard.content.readings))
    }
  }, [cardId, deckId, isNew, loadedCard])

  function resetNewCardForm() {
    setVocab(defaultVocabulary())
    setGrammar(defaultGrammar())
    setFuriganaDraft("")
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
      const nextVocab = vocabularyFromGrammarContent(grammar)
      setVocab(nextVocab)
      setFuriganaDraft(readingsMapToText(nextVocab.readings ?? {}))
      setKind("vocabulary")
      return
    }

    const nextGrammar = grammarFromVocabularyContent(vocab)
    setGrammar(nextGrammar)
    setFuriganaDraft(readingsMapToText(nextGrammar.readings))
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
          await createVocabularyCard(deckId, vocab)
          resetNewCardForm()
          return
        } else {
          await saveCard(currentCardDraft())
        }
      } else {
        const normalizedGrammar = normalizeGrammarContent(grammar)
        const emsg = validateGrammar(normalizedGrammar)
        if (emsg) throw new Error(emsg)
        if (isNew) {
          await createGrammarCard(deckId, normalizedGrammar)
          resetNewCardForm()
          return
        } else {
          await saveCard({
            id: cardId,
            deckId,
            kind: "grammar",
            content: normalizedGrammar,
            updatedAt: Date.now(),
          })
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

  async function onConfirmDeleteCard() {
    setConfirmingDelete(false)
    try {
      await deleteCard(cardId)
      navigate(returnTo ?? `/decks/${deckId}`)
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Delete failed")
    }
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
      const merged = await mergeCards(currentCardDraft(), match)
      if (merged.kind === "vocabulary") {
        setVocab(merged.content)
        setFuriganaDraft(readingsMapToText(merged.content.readings ?? {}))
      } else {
        setGrammar(merged.content)
        setFuriganaDraft(readingsMapToText(merged.content.readings))
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
        ids.push(await saveImageBlob(file))
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

  async function onRemoveImage(id: string) {
    setErr(null)
    try {
      // Persist the removal immediately (like card deletion) rather than
      // deferring to Save — the blob is about to be deleted for good, so the
      // card must stop referencing it even if the user navigates away without
      // saving the rest of the form.
      if (kind === "vocabulary") {
        const updated = {
          ...vocab,
          images: vocab.images.filter((imgId) => imgId !== id),
        }
        if (!isNew) {
          await saveCard({
            id: cardId,
            deckId,
            kind: "vocabulary",
            content: updated,
            updatedAt: Date.now(),
          })
        }
        setVocab(updated)
      } else {
        const updated = {
          ...grammar,
          images: grammar.images.filter((imgId) => imgId !== id),
        }
        if (!isNew) {
          await saveCard({
            id: cardId,
            deckId,
            kind: "grammar",
            content: updated,
            updatedAt: Date.now(),
          })
        }
        setGrammar(updated)
      }

      // Bulk import dedups identical images across notes, so this id may
      // still back a different card — only delete the blob once nothing else
      // points at it.
      if (!(await isMediaReferencedByOtherCards(id, cardId))) {
        await deleteImageBlob(id)
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed to remove image")
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

  if (loading) return <div className="page">読み込み中</div>

  return (
    <div className="page">
      <header className="header app-header">
        <PageHeading backTo={backTo} backLabel={returnTo ? "Back" : "Back to deck"}>
          {isNew ? "新規カード" : "カード編集"}
        </PageHeading>
        <div className="header-actions">
          <UserMenu />
          <SyncButton />
        </div>
      </header>

      {!isNew && (
        <div className="toolbar card-edit-toolbar">
          <button type="button" className="btn secondary" onClick={onFindDuplicates}>
            重複カード検索
          </button>
          <button type="button" className="btn primary pink" onClick={onDeleteCard}>
            削除
          </button>
        </div>
      )}

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
          message="このカードを削除してもよろしいですか？"
          onConfirm={onConfirmDeleteCard}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <form
        ref={formRef}
        onSubmit={onSubmit}
        onPaste={onPaste}
        className="panel stack card-edit-form"
        aria-label="Card editor"
      >
        <Switch
          legend="Type"
          name="card-kind"
          value={kind}
          onChange={onKindChange}
          options={[
            { value: "vocabulary", label: CARD_KIND_LABELS.vocabulary },
            { value: "grammar", label: CARD_KIND_LABELS.grammar },
          ]}
        />

        {kind === "vocabulary" ? (
          <>
            <label>
              日本語で
              <input
                className="input"
                value={vocab.wordJa}
                onChange={(e) => {
                  const wordJa = e.target.value
                  const kanaOnly = isKanaOnly(wordJa)
                  const reading = kanaOnly ? undefined : vocab.reading
                  const readingParts = kanaOnly ? {} : vocab.readingParts
                  setVocab((v) => ({ ...v, wordJa, reading, readingParts }))
                }}
                required
              />
            </label>
            {duplicateJapaneseWarning && (
              <p className="warn small" role="status">
                {duplicateJapaneseWarning}
              </p>
            )}
            <label>
              意味
              <input
                className="input"
                value={vocab.definitionsEn.join("; ")}
                onChange={(e) =>
                  setVocab({
                    ...vocab,
                    definitionsEn: e.target.value.split("; "),
                  })
                }
              />
            </label>
            <label>
              ひらがなで
              <input
                className="input"
                aria-label="Reading"
                value={vocab.reading ?? ""}
                onChange={(e) => {
                  const reading = e.target.value
                  setVocab((v) => ({
                    ...v,
                    reading: reading || undefined,
                    readingParts: {},
                  }))
                }}
              />
            </label>
            <label>
              例文
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
              ふりがな
              <textarea
                className="input"
                rows={4}
                aria-label="Furigana"
                value={furiganaDraft}
                onChange={(e) => {
                  const text = e.target.value
                  setFuriganaDraft(text)
                  setVocab((v) => ({ ...v, readings: parseReadingsMapText(text) }))
                }}
              />
            </label>
            <button
              type="button"
              className="btn secondary align-end"
              aria-label="Fill in kanji"
              onClick={() => {
                const next = addMissingKanjiLines(furiganaDraft, [
                  vocab.wordJa,
                  ...vocab.exampleSentences,
                ])
                setFuriganaDraft(next)
                setVocab((v) => ({ ...v, readings: parseReadingsMapText(next) }))
              }}
            >
              漢字入れる
            </button>
            <label>
              紛らわしい言葉
              <textarea
                className="input"
                rows={2}
                aria-label="Confused words"
                placeholder="Words you tend to mix this one up with, one per line"
                value={(vocab.confusedWith ?? []).join("\n")}
                onChange={(e) =>
                  setVocab({
                    ...vocab,
                    confusedWith: e.target.value.split("\n"),
                  })
                }
              />
            </label>
            <fieldset className="plain">
              <legend>画像</legend>
              <ImagePreviewList
                imageIds={vocab.images}
                onRemove={onRemoveImage}
                onAdd={() => imageInputRef.current?.click()}
              />
            </fieldset>
          </>
        ) : (
          <>
            <label>
              問題文
              <input
                className="input"
                value={grammar.sentenceWithGap}
                onChange={(e) =>
                  setGrammar({
                    ...grammar,
                    sentenceWithGap: e.target.value,
                    gapMarker: detectGapMarker(e.target.value),
                  })
                }
              />
            </label>
            <label>
              答え
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
            <LabeledToggle
              legend="Testing"
              name="grammar-sides"
              value={grammar.singleSided ? "one" : "both"}
              onChange={(sides) =>
                setGrammar({ ...grammar, singleSided: sides === "one" })
              }
              options={[
                { value: "both", label: "両面" },
                { value: "one", label: "片面" },
              ]}
            />
            <label>
              意味
              <input
                className="input"
                value={grammar.translationEn}
                onChange={(e) =>
                  setGrammar({ ...grammar, translationEn: e.target.value })
                }
              />
            </label>
            <label>
              ひらがなで
              <input
                className="input"
                aria-label="Reading"
                value={grammar.constructionReading ?? ""}
                onChange={(e) => {
                  const reading = e.target.value
                  setGrammar((g) => ({
                    ...g,
                    constructionReading: reading || undefined,
                    constructionReadingParts: {},
                  }))
                }}
              />
            </label>
            <label>
              ふりがな
              <textarea
                className="input"
                rows={4}
                aria-label="Furigana"
                value={furiganaDraft}
                onChange={(e) => {
                  const text = e.target.value
                  setFuriganaDraft(text)
                  setGrammar((g) => ({ ...g, readings: parseReadingsMapText(text) }))
                }}
              />
            </label>
            <button
              type="button"
              className="btn secondary align-end"
              aria-label="Fill in kanji"
              onClick={() => {
                const next = addMissingKanjiLines(furiganaDraft, [
                  grammar.construction,
                  grammar.sentenceWithGap,
                ])
                setFuriganaDraft(next)
                setGrammar((g) => ({ ...g, readings: parseReadingsMapText(next) }))
              }}
            >
              漢字入れる
            </button>
            <label>
              紛らわしい言葉
              <textarea
                className="input"
                rows={2}
                aria-label="Confused words"
                placeholder="Constructions you tend to mix this one up with, one per line"
                value={(grammar.confusedWith ?? []).join("\n")}
                onChange={(e) =>
                  setGrammar({
                    ...grammar,
                    confusedWith: e.target.value.split("\n"),
                  })
                }
              />
            </label>
            <fieldset className="plain">
              <legend>画像</legend>
              <ImagePreviewList
                imageIds={grammar.images}
                onRemove={onRemoveImage}
                onAdd={() => imageInputRef.current?.click()}
              />
            </fieldset>
          </>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void onPickImage(e.currentTarget.files)
            e.currentTarget.value = ""
          }}
        />

        {isUploadingImages && (
          <p className="muted small" aria-live="polite">
            {imageUploadCount === 1
              ? "Adding image…"
              : `Adding ${imageUploadCount} images…`}
          </p>
        )}
        {err && <p className="error">{err}</p>}
        <button
          type="submit"
          className="btn primary blue align-end"
          disabled={isUploadingImages}
        >
          保存
        </button>
      </form>
    </div>
  )
}

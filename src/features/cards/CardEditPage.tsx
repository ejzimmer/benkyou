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
  isMediaReferencedByOtherCards,
  mergeCards,
  normalizeGrammarContent,
  saveCard,
  validateGrammar,
  validateVocabulary,
  vocabularyFromGrammarContent,
} from "../../services/cards"
import { deleteImageBlob, saveImageBlob } from "../../services/media"
import { useAuth } from "../../lib/auth/AuthContext"
import { db } from "../../lib/db/schema"
import { CardImage } from "../../ui/CardImage"
import { normalizeJapanese } from "../../lib/japanese/normalize"
import { findDuplicateCards, japaneseWordForCard } from "../../domain/duplicates"
import { DuplicateCardsModal } from "./DuplicateCardsModal"
import { ConfirmModal } from "../../ui/ConfirmModal"
import { PageHeading } from "../../ui/PageHeading"
import {
  deriveFurigana,
  parseReadingsMapText,
  parseWordReadingText,
  readingsMapToText,
  reseedFurigana,
  wordReadingToText,
  type LabeledReading,
} from "../../domain/readingsMap"

/** The word/reading pair(s) actually tested for a vocab card right now —
 * the phrase segments when set, else the single whole-word reading. */
function vocabTestedParts(content: VocabularyCardContent): LabeledReading[] {
  if (content.reading?.trim()) {
    return [{ label: content.wordJa, reading: content.reading }]
  }
  return Object.entries(content.readingParts ?? {})
    .filter(([label, reading]) => label.trim() && reading.trim())
    .map(([label, reading]) => ({ label, reading }))
}

/** Same as `vocabTestedParts`, for a grammar card's construction. */
function grammarTestedParts(content: GrammarCardContent): LabeledReading[] {
  if (content.constructionReading?.trim()) {
    return [{ label: content.construction, reading: content.constructionReading }]
  }
  return Object.entries(content.constructionReadingParts ?? {})
    .filter(([label, reading]) => label.trim() && reading.trim())
    .map(([label, reading]) => ({ label, reading }))
}

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
}: {
  imageIds: string[]
  onRemove: (id: string) => void
}) {
  if (imageIds.length === 0) return null

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
  /** Controlled drafts so incomplete `kanji=` lines are not dropped on each keystroke */
  const [readingsMapDraft, setReadingsMapDraft] = useState("")
  const [vocabReadingDraft, setVocabReadingDraft] = useState("")
  const [grammarReadingDraft, setGrammarReadingDraft] = useState("")
  /**
   * The furigana map (`readings`) is auto-seeded from whatever's actually
   * tested (`reading`/`readingParts` or `constructionReading`/
   * `constructionReadingParts`) so authors don't have to duplicate it by
   * hand — but it stays independently editable afterwards (e.g. narrowed to
   * just the kanji). These track the last seed applied, so a later re-seed
   * only touches entries the author hasn't since changed by hand.
   */
  const vocabFuriganaSeedRef = useRef<Record<string, string>>({})
  const grammarFuriganaSeedRef = useRef<Record<string, string>>({})
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

  /**
   * Apply a partial update to the vocab draft, then re-seed the furigana map
   * (`readings`) from whatever's now tested — replacing only the entries
   * the last seed put there and the author hasn't since edited by hand.
   */
  function updateVocab(partial: Partial<VocabularyCardContent>) {
    const next = { ...vocab, ...partial }
    const nextSeed = deriveFurigana(vocabTestedParts(next))
    const readings = reseedFurigana(
      next.readings ?? {},
      vocabFuriganaSeedRef.current,
      nextSeed,
    )
    vocabFuriganaSeedRef.current = nextSeed
    setReadingsMapDraft(readingsMapToText(readings))
    setVocab({ ...next, readings })
  }

  /** Same as `updateVocab`, for the grammar draft's construction reading. */
  function updateGrammar(partial: Partial<GrammarCardContent>) {
    const next = { ...grammar, ...partial }
    const nextSeed = deriveFurigana(grammarTestedParts(next))
    const readings = reseedFurigana(
      next.readings,
      grammarFuriganaSeedRef.current,
      nextSeed,
    )
    grammarFuriganaSeedRef.current = nextSeed
    setReadingsMapDraft(readingsMapToText(readings))
    setGrammar({ ...next, readings })
  }

  // Tracks which cardId the form has already been hydrated from, so that
  // live-query emissions caused by unrelated writes to this row (e.g. a
  // background sync pass rewriting the card) don't clobber in-progress edits.
  const hydratedCardIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setErr(null)
      setReadingsMapDraft("")
      setVocabReadingDraft("")
      setGrammarReadingDraft("")
      vocabFuriganaSeedRef.current = {}
      grammarFuriganaSeedRef.current = {}
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
      setReadingsMapDraft(readingsMapToText(loadedCard.content.readings ?? {}))
      setVocabReadingDraft(
        wordReadingToText(
          loadedCard.content.reading,
          loadedCard.content.readingParts,
        ),
      )
      vocabFuriganaSeedRef.current = deriveFurigana(
        vocabTestedParts(loadedCard.content),
      )
    } else {
      setGrammar(loadedCard.content)
      setReadingsMapDraft(readingsMapToText(loadedCard.content.readings))
      setGrammarReadingDraft(
        wordReadingToText(
          loadedCard.content.constructionReading,
          loadedCard.content.constructionReadingParts,
        ),
      )
      grammarFuriganaSeedRef.current = deriveFurigana(
        grammarTestedParts(loadedCard.content),
      )
    }
  }, [cardId, deckId, isNew, loadedCard])

  function resetNewCardForm() {
    setVocab(defaultVocabulary())
    setGrammar(defaultGrammar())
    setReadingsMapDraft("")
    setVocabReadingDraft("")
    setGrammarReadingDraft("")
    vocabFuriganaSeedRef.current = {}
    grammarFuriganaSeedRef.current = {}
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
      setReadingsMapDraft(readingsMapToText(nextVocab.readings ?? {}))
      setVocabReadingDraft(
        wordReadingToText(nextVocab.reading, nextVocab.readingParts),
      )
      vocabFuriganaSeedRef.current = deriveFurigana(vocabTestedParts(nextVocab))
      setKind("vocabulary")
      return
    }

    const nextGrammar = grammarFromVocabularyContent(vocab)
    setGrammar(nextGrammar)
    setReadingsMapDraft(readingsMapToText(nextGrammar.readings))
    setGrammarReadingDraft(
      wordReadingToText(
        nextGrammar.constructionReading,
        nextGrammar.constructionReadingParts,
      ),
    )
    grammarFuriganaSeedRef.current = deriveFurigana(
      grammarTestedParts(nextGrammar),
    )
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
        setReadingsMapDraft(readingsMapToText(merged.content.readings ?? {}))
        setVocabReadingDraft(
          wordReadingToText(merged.content.reading, merged.content.readingParts),
        )
        vocabFuriganaSeedRef.current = deriveFurigana(
          vocabTestedParts(merged.content),
        )
      } else {
        setGrammar(merged.content)
        setReadingsMapDraft(readingsMapToText(merged.content.readings))
        setGrammarReadingDraft(
          wordReadingToText(
            merged.content.constructionReading,
            merged.content.constructionReadingParts,
          ),
        )
        grammarFuriganaSeedRef.current = deriveFurigana(
          grammarTestedParts(merged.content),
        )
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
          await saveCard(
            { id: cardId, deckId, kind: "vocabulary", content: updated, updatedAt: Date.now() },
            user,
          )
        }
        setVocab(updated)
      } else {
        const updated = {
          ...grammar,
          images: grammar.images.filter((imgId) => imgId !== id),
        }
        if (!isNew) {
          await saveCard(
            { id: cardId, deckId, kind: "grammar", content: updated, updatedAt: Date.now() },
            user,
          )
        }
        setGrammar(updated)
      }

      // Bulk import dedups identical images across notes, so this id may
      // still back a different card — only delete the blob once nothing else
      // points at it.
      if (!(await isMediaReferencedByOtherCards(id, cardId))) {
        await deleteImageBlob(id, user)
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

  if (loading) return <div className="page">Loading…</div>

  return (
    <div className="page">
      <header className="header">
        <PageHeading backTo={backTo} backLabel={returnTo ? "Back" : "Back to deck"}>
          {isNew ? "New card" : "Edit card"}
        </PageHeading>
      </header>

      {!isNew && (
        <div className="toolbar">
          <button type="button" className="btn" onClick={onFindDuplicates}>
            Find duplicate cards
          </button>
          <button type="button" className="btn danger" onClick={onDeleteCard}>
            Delete card
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
                  const kanaOnly = isKanaOnly(wordJa)
                  updateVocab({
                    wordJa,
                    reading: kanaOnly ? undefined : vocab.reading,
                    readingParts: kanaOnly ? {} : vocab.readingParts,
                  })
                  if (kanaOnly) setVocabReadingDraft("")
                }}
                required
              />
            </label>
            <label>
              Reading (hiragana — kanji words only). For a phrase tested
              cluster by cluster instead of as one whole reading, use
              kanjiPhrase=reading pairs instead, one per line (e.g.
              結論=けつろん, 至る=いたる).
              <textarea
                className="input"
                rows={3}
                aria-label="Reading"
                value={vocabReadingDraft}
                disabled={isKanaOnly(vocab.wordJa)}
                onChange={(e) => {
                  const text = e.target.value
                  setVocabReadingDraft(text)
                  const { reading, readingParts } = parseWordReadingText(text)
                  updateVocab({ reading, readingParts })
                }}
              />
            </label>
            {!containsKanji(vocab.wordJa) && (
              <p className="muted small">
                Kana-only words do not need a reading.
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
              Furigana shown for the word above and in the example sentences
              (format: kanjiPhrase=reading, one per line) — separate from
              what's tested, and auto-filled from the reading(s) above, but
              editable on its own. Narrow an entry to just the kanji (e.g.
              至る=いたる → 至=いた) to leave okurigana un-annotated, the
              usual furigana convention.
              <textarea
                className="input"
                rows={4}
                aria-label="Kanji to reading map"
                value={readingsMapDraft}
                onChange={(e) => {
                  const text = e.target.value
                  setReadingsMapDraft(text)
                  setVocab((v) => ({
                    ...v,
                    readings: parseReadingsMapText(text),
                  }))
                }}
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
            <ImagePreviewList imageIds={vocab.images} onRemove={onRemoveImage} />
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
                onChange={(e) => {
                  const construction = e.target.value
                  const kanaOnly = isKanaOnly(construction)
                  updateGrammar({
                    construction,
                    constructionReading: kanaOnly
                      ? undefined
                      : grammar.constructionReading,
                    constructionReadingParts: kanaOnly
                      ? {}
                      : grammar.constructionReadingParts,
                  })
                  if (kanaOnly) setGrammarReadingDraft("")
                }}
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
              Grammar point (e.g. "conjugation", "particle") — leave blank
              for a semantic gap that tests word choice, meaning, and
              reading. When set, review only asks you to fill in the gap in
              Japanese, phrased as “What's the correct {"{value}"}?”.
              <input
                className="input"
                value={grammar.grammarPoint ?? ""}
                onChange={(e) =>
                  setGrammar({ ...grammar, grammarPoint: e.target.value })
                }
              />
            </label>
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
              Reading of the construction (hiragana) — independent of the
              construction's literal text above, so a conjugated form (e.g.
              芳しく) can test its dictionary form's reading (かんばしい)
              instead of the conjugated one. For a construction that's
              several words/clusters tested separately, use
              kanjiPhrase=reading pairs instead, one per line (e.g.
              流し=ながし, 呼ぶ=よぶ).
              <textarea
                className="input"
                rows={3}
                aria-label="Construction reading"
                value={grammarReadingDraft}
                onChange={(e) => {
                  const text = e.target.value
                  setGrammarReadingDraft(text)
                  const { reading, readingParts } = parseWordReadingText(text)
                  updateGrammar({
                    constructionReading: reading,
                    constructionReadingParts: readingParts,
                  })
                }}
              />
            </label>
            <label>
              Furigana shown in the sentence above (format:
              kanjiPhrase=reading, one per line) — separate from what's
              tested, and auto-filled from the reading(s) above, but
              editable on its own. Narrow an entry to just the kanji (e.g.
              芳しく=かんばしい → 芳=かんば) to leave okurigana
              un-annotated, the usual furigana convention.
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
                    readings: parseReadingsMapText(text),
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
            <ImagePreviewList imageIds={grammar.images} onRemove={onRemoveImage} />
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

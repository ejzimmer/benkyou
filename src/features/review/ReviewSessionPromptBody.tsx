import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import type { DueItem } from "../../services/review"
import { RubySentence, RubyWord } from "../../ui/KanjiRuby"
import { CardImageRow } from "../../ui/CardImageRow"
import { ChevronDownIcon } from "../../ui/ChevronDownIcon"
import {
  clueExampleSentences,
  readingForConstruction,
  vocabExampleReadings,
} from "./reviewFlowHelpers"
import {
  countGaps,
  GAP_ANSWER_JOIN,
  splitGapAnswers,
  typedGapValues,
} from "../../domain/grammarGaps"
import { phraseReadingSegments } from "../../domain/vocabularyContent"
import { constructionReadingSegments } from "../../domain/grammarContent"
import { containsKanji } from "../../domain/types"
import {
  deriveFurigana,
  fullyCoveredSegments,
  type LabeledReading,
} from "../../domain/readingsMap"

type TypingAnswerInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  focusKey: string
  autoComplete?: string
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  autoFocus?: boolean
}

function isTouchPrimaryDevice() {
  if (typeof window.matchMedia !== "function") return false
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches
}

// A small "random" pad (1-3) added to a gap's width so a row of gaps doesn't
// look mechanically uniform. Seeded from the text itself, rather than
// Math.random(), so the same gap keeps the same width across re-renders
// (e.g. every keystroke re-renders the whole prompt) instead of visibly
// jittering as the user types.
function seededPad(text: string): number {
  let sum = 0
  for (const ch of text) sum += ch.codePointAt(0) ?? 0
  return (sum % 3) + 1
}

// The `ch` unit is the width of the font's "0" glyph, which in the app's
// Japanese-capable font stack is much narrower than a full-width kana glyph —
// sizing kana text by raw character count in `ch` leaves the box too
// cramped for what actually gets typed into it.
const KANA_CH_WIDTH = 1.8

// Sizes an inline gap input to roughly fit what will actually be typed into
// it: readings are typed in hiragana, which runs longer than a kanji answer
// itself, so a kanji answer with a known reading is sized off the reading
// rather than the kanji. A kanji answer with no reading available has no
// hiragana length to go on, so it falls back to a rougher kanji-count-based
// estimate.
function gapInputWidthStyle(answerText: string, reading?: string): CSSProperties {
  if (!containsKanji(answerText)) {
    const len = Array.from(answerText).length
    return { width: `${len * KANA_CH_WIDTH + seededPad(answerText)}ch` }
  }
  if (reading?.trim()) {
    const len = Array.from(reading).length
    return { width: `${len * KANA_CH_WIDTH + seededPad(reading)}ch` }
  }
  return { width: `${Array.from(answerText).length * 2.5 * KANA_CH_WIDTH}ch` }
}

function TypingAnswerInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  focusKey,
  autoComplete,
  className,
  style,
  ariaLabel,
  autoFocus = true,
}: TypingAnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!autoFocus || !input || isTouchPrimaryDevice()) return
    input.focus({ preventScroll: true })
  }, [autoFocus, focusKey])

  return (
    <input
      ref={inputRef}
      className={className ? `input ${className}` : "input"}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        e.target.scrollIntoView?.({ block: "nearest", inline: "nearest" })
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return
        if (e.nativeEvent.isComposing) return
        e.preventDefault()
        onSubmit()
      }}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
    />
  )
}

export type ReviewSessionPromptBodyProps = {
  item: DueItem
  typed: string
  onTypedChange: (value: string) => void
  readingWarn: boolean
  kanjiWarn: boolean
  /** Typed answer contains Latin/English characters — a validation error,
   * not a graded mistake, for modes expecting a Japanese answer. */
  latinWarn?: boolean
  /** Reading answer is wrong only because of a missed doubled "n" before a
   * vowel/や行 mora (e.g. typing "unei" instead of "unnei" for うんえい) —
   * a validation error, not a graded mistake. */
  nWarn?: boolean
  /** Typed answer matches a word the card author flagged (`confusedWith`) as
   * easy to mix up with the actual answer — the matched word itself, so the
   * message can name it. A validation error, not a graded mistake. */
  confusedMatch?: string | null
  /** Called when user presses Enter in a typing field */
  onTypedSubmit: () => void
  /** Answer is visible — show the prompt only, not typing inputs or warnings */
  revealed?: boolean
  /**
   * Which half of the two-column review layout to render: the clue/context
   * ("question") or the typing input and its warnings ("answer"). Most modes
   * have nothing for one side (e.g. oral modes have no typing input, and a
   * grammar card's inline gap keeps its input in the question sentence
   * itself) — those return null for that column.
   */
  column: "question" | "answer"
  /**
   * Bumped by the parent each time the prompt (re-)becomes the active side —
   * including returning to the same card/mode via "Undo answer" or "Undo last
   * judgement". The prompt/answer layers stay permanently mounted (so
   * revealing the answer never resizes the card), so `focusKey` alone
   * (card id + mode, unchanged across an undo) can't retrigger
   * TypingAnswerInput's autofocus-on-mount effect the way a fresh mount used
   * to. Folding this into `focusKey` does.
   */
  promptFocusToken?: number
}

export function ReviewSessionPromptBody({
  item,
  typed,
  onTypedChange,
  readingWarn,
  kanjiWarn,
  latinWarn = false,
  nWarn = false,
  confusedMatch = null,
  onTypedSubmit,
  revealed = false,
  column,
  promptFocusToken = 0,
}: ReviewSessionPromptBodyProps) {
  const { card, modeId: m } = item
  const focusKey = `${card.id}:${m}:${promptFocusToken}`

  // Shared open/closed state for the "show meaning/examples/images" disclosure
  // used by both reading-quiz modes below. Reset whenever the prompt changes
  // (new card, mode, or a return via undo) since this component instance can
  // be reused across cards rather than remounted.
  const [extrasOpen, setExtrasOpen] = useState(false)
  const extrasContentId = useId()
  useEffect(() => setExtrasOpen(false), [focusKey])

  function renderExtrasToggle(label: string) {
    return (
      <button
        type="button"
        className="prompt-extras-toggle"
        aria-expanded={extrasOpen}
        aria-controls={extrasContentId}
        onClick={() => setExtrasOpen((open) => !open)}
      >
        <ChevronDownIcon
          className={`prompt-extras-chevron${extrasOpen ? " is-open" : ""}`}
        />
        <span className="sr-only">{label}</span>
      </button>
    )
  }

  function renderExtrasContent(content: React.ReactNode) {
    return (
      <div
        id={extrasContentId}
        className={`prompt-extras${extrasOpen ? " is-open" : ""}`}
        aria-hidden={!extrasOpen}
      >
        <div className="prompt-extras-content stack">{content}</div>
      </div>
    )
  }

  // Asking for the English meaning: show the Japanese word, with example
  // sentences hidden behind an expander (like the reading-quiz modes below) so
  // they don't hand you free vocab/context clues before you've had a go at
  // the meaning yourself. Kanji readings stay available on hover/focus via
  // <RubyWord>. No typing input for this mode — it's answered aloud.
  if (m === "vocab_oral_en" && card.kind === "vocabulary") {
    if (column === "answer") return null
    const examples = card.content.exampleSentences.filter((s) => s.trim())
    const exampleReadings = vocabExampleReadings(card.content)
    const wordSegments = fullyCoveredSegments(
      card.content.wordJa,
      card.content.readings ?? {},
    )
    const hasHidden = examples.length > 0
    return (
      <div className="stack prompt-extras-anchor">
        <div className="prompt-extras-row">
          <p className="prompt-main">
            {wordSegments ? (
              // The furigana map fully accounts for every kanji in the word —
              // honor the author's own per-kanji breakdown (e.g. narrowed to
              // leave okurigana un-annotated) instead of one flat ruby.
              wordSegments.map((s, i) =>
                s.reading?.trim() ? (
                  <RubyWord key={i} surface={s.text} reading={s.reading} />
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )
            ) : (
              // The map doesn't (yet) cover the whole word — e.g. a card
              // whose furigana was never authored — so fall back to the
              // authoritative whole-word reading rather than showing
              // partial/no furigana.
              <RubyWord surface={card.content.wordJa} reading={card.content.reading} />
            )}
          </p>
          {hasHidden && renderExtrasToggle("Show example sentences")}
        </div>
        {hasHidden &&
          renderExtrasContent(
            examples.map((s, i) => (
              <p key={i} className="muted">
                <RubySentence sentence={s} gapMarker="" readings={exampleReadings} />
              </p>
            )),
          )}
      </div>
    )
  }

  // Asking for the Japanese reading: show only the kanji. Everything that could
  // give the reading away (images, meanings, examples) hides behind an expander.
  if (m === "vocab_type_reading" && card.kind === "vocabulary") {
    const wordSegments = card.content.reading?.trim()
      ? []
      : (phraseReadingSegments(card.content) ?? [])
    const kanjiSegments = wordSegments.filter((s) => s.reading?.trim())
    const usesPerSegmentInputs = kanjiSegments.length > 1

    if (column === "question") {
      const definitions = card.content.definitionsEn.filter((s) => s.trim())
      const examples = card.content.exampleSentences.filter((s) => s.trim())
      // The furigana map is seeded from the tested reading (whole-word or
      // per-segment), so it normally contains an entry for the word itself —
      // that's exactly this mode's answer, and must not leak through the
      // "hidden" example-sentence furigana before reveal. A tested label
      // isn't necessarily a substring of wordJa (e.g. a dictionary-form
      // reading for a conjugated word), so derive the exact keys that would
      // be seeded from what's actually tested, rather than guessing via a
      // substring match.
      const testedParts: LabeledReading[] = card.content.reading?.trim()
        ? [{ label: card.content.wordJa, reading: card.content.reading }]
        : kanjiSegments.map((s) => ({ label: s.text, reading: s.reading ?? "" }))
      // Exclude both the raw tested label (結論, 至る) and its auto-seeded
      // kanji-only-stripped form (至) — a hand-maintained readings map may
      // use either convention.
      const quizzedFuriganaKeys = new Set([
        ...testedParts.map((p) => p.label),
        ...Object.keys(deriveFurigana(testedParts)),
      ])
      const exampleReadings = Object.fromEntries(
        Object.entries(card.content.readings ?? {}).filter(
          ([k]) => !quizzedFuriganaKeys.has(k),
        ),
      )
      const hasHidden =
        definitions.length > 0 ||
        examples.length > 0 ||
        card.content.images.length > 0
      return (
        <div className="stack prompt-extras-anchor">
          <div className="prompt-extras-row">
            <p className="prompt-main">{card.content.wordJa}</p>
            {hasHidden && renderExtrasToggle("Show meaning, examples & images")}
          </div>
          {hasHidden &&
            renderExtrasContent(
              <>
                {definitions.length > 0 && (
                  <ul className="meanings-list">
                    {definitions.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
                {examples.map((s, i) => (
                  <p key={i} className="muted">
                    <RubySentence sentence={s} gapMarker="" readings={exampleReadings} />
                  </p>
                ))}
                <CardImageRow images={card.content.images} />
              </>,
            )}
        </div>
      )
    }

    if (revealed) return null

    function segInputValue(i: number) {
      return usesPerSegmentInputs
        ? typedGapValues(typed, kanjiSegments.length)[i] ?? ""
        : typed
    }
    function onSegInputChange(i: number, value: string) {
      if (!usesPerSegmentInputs) {
        onTypedChange(value)
        return
      }
      const parts = typedGapValues(typed, kanjiSegments.length)
      parts[i] = value
      onTypedChange(parts.join(GAP_ANSWER_JOIN))
    }

    return (
      <div className="stack">
        <div className="answer-input-anchor">
          {usesPerSegmentInputs ? (
            <div className="phrase-reading-inputs">
              {kanjiSegments.map((seg, i) => (
                <label key={i} className="phrase-reading-input">
                  <span className="input-label-text">{seg.text}（ひらがなで）</span>
                  <TypingAnswerInput
                    value={segInputValue(i)}
                    onChange={(value) => onSegInputChange(i, value)}
                    onSubmit={onTypedSubmit}
                    focusKey={focusKey}
                    autoComplete="off"
                    autoFocus={i === 0}
                    ariaLabel={`Reading for ${seg.text}`}
                  />
                </label>
              ))}
            </div>
          ) : (
            <label>
              <span className="input-label-text">ひらがなで</span>
              <TypingAnswerInput
                value={typed}
                onChange={onTypedChange}
                onSubmit={onTypedSubmit}
                focusKey={focusKey}
                autoComplete="off"
              />
            </label>
          )}
          {readingWarn && (
            <p className="error">
              読み方には、ひらがなのみを使用してください。
            </p>
          )}
          {nWarn && (
            <p className="error">
              「ん」が抜けているようです。母音の前や「や/ゆ/よ」の前では、「nn」と入力してみてください。
            </p>
          )}
        </div>
      </div>
    )
  }

  // Asking for the Japanese word: show the English meaning, plus any example
  // sentences that keep the answer blanked out, plus images (sized to fit).
  if (m === "vocab_type_word_from_clue" && card.kind === "vocabulary") {
    if (column === "question") {
      const definitions = card.content.definitionsEn.filter((s) => s.trim())
      const examples = clueExampleSentences(card.content)
      const exampleReadings = vocabExampleReadings(card.content)
      return (
        <div className="stack">
          {definitions.length > 0 && (
            <div className="prompt-main">
              {definitions.map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          )}
          {examples.length > 0 && (
            <div className="example-sentences">
              {examples.map((s, i) => (
                <p key={i} className="muted">
                  <RubySentence sentence={s} gapMarker="" readings={exampleReadings} />
                </p>
              ))}
            </div>
          )}
          <CardImageRow images={card.content.images} />
        </div>
      )
    }

    if (revealed) return null
    return (
      <div className="stack word-from-clue-input">
        <div className="answer-input-anchor">
          <label>
            <span className="input-label-text">日本語で</span>
            <TypingAnswerInput
              value={typed}
              onChange={onTypedChange}
              onSubmit={onTypedSubmit}
              focusKey={focusKey}
            />
          </label>
          {latinWarn && (
            <p className="error">解答は日本語で入力してください。</p>
          )}
          {kanjiWarn && (
            <p className="error">この解答には漢字が必要です。</p>
          )}
          {confusedMatch && (
            <p className="error">
              「{confusedMatch}」は、このカードの解答と似ています。
            </p>
          )}
        </div>
      </div>
    )
  }

  if (m === "grammar_type_construction" && card.kind === "grammar") {
    if (column === "question") {
      const gapCount = countGaps(
        card.content.sentenceWithGap,
        card.content.gapMarker,
      )
      // Only split into one input per gap when the construction already has a
      // matching number of comma-separated answers — otherwise fall back to a
      // single shared input at every gap (e.g. while the card is still being
      // authored, or for the common single-gap case).
      const construction = card.content.construction
      const constructionParts = splitGapAnswers(construction)
      const usesPerGapInputs =
        gapCount > 1 && constructionParts.length === gapCount

      function gapInputValue(gapIndex: number): string {
        return usesPerGapInputs
          ? typedGapValues(typed, gapCount)[gapIndex] ?? ""
          : typed
      }

      function onGapInputChange(gapIndex: number, value: string) {
        if (!usesPerGapInputs) {
          onTypedChange(value)
          return
        }
        const parts = typedGapValues(typed, gapCount)
        parts[gapIndex] = value
        onTypedChange(parts.join(GAP_ANSWER_JOIN))
      }

      function gapAnswerText(gapIndex: number): string {
        return usesPerGapInputs
          ? (constructionParts[gapIndex] ?? construction)
          : construction
      }

      return (
        <div className="stack">
          <div className="prompt-main grammar-gap-sentence">
            <RubySentence
              sentence={card.content.sentenceWithGap}
              gapMarker={card.content.gapMarker}
              readings={card.content.readings}
              renderGap={
                revealed
                  ? (gapIndex) => (
                      <span className="gap-filled">
                        {gapInputValue(gapIndex) || "—"}
                      </span>
                    )
                  : (gapIndex) => {
                      const answerText = gapAnswerText(gapIndex)
                      return (
                        <TypingAnswerInput
                          value={gapInputValue(gapIndex)}
                          onChange={(value) => onGapInputChange(gapIndex, value)}
                          onSubmit={onTypedSubmit}
                          focusKey={focusKey}
                          className="inline-gap-input"
                          style={gapInputWidthStyle(
                            answerText,
                            readingForConstruction(
                              answerText,
                              card.content.readings,
                            ),
                          )}
                          ariaLabel={`Construction gap ${gapIndex + 1}`}
                          autoFocus={gapIndex === 0}
                        />
                      )
                    }
              }
            />
          </div>
          {card.content.translationEn.trim() && (
            <p className="muted">{card.content.translationEn}</p>
          )}
          <CardImageRow images={card.content.images} />
        </div>
      )
    }

    // The gap's input lives inline in the question sentence, so the answer
    // column only ever needs to show validation warnings, with no input of
    // its own to anchor them against.
    if (revealed) return null
    return (
      <div className="stack">
        {latinWarn && (
          <p className="error">解答は日本語で入力してください。</p>
        )}
        {kanjiWarn && (
          <p className="error">この解答には漢字が必要です。</p>
        )}
        {confusedMatch && (
          <p className="error">
            「{confusedMatch}」は、このカードの解答と似ています。
          </p>
        )}
      </div>
    )
  }

  // Asking for the reading of the construction: the gap is filled with the
  // plain kanji (no ruby — that would give away the answer), and the
  // meaning/images hide behind an expander like the vocab reading quiz.
  if (m === "grammar_type_reading" && card.kind === "grammar") {
    const sentence = card.content.sentenceWithGap
    const construction = card.content.construction
    // For a multi-gap sentence with one comma-separated answer per gap, fill
    // each gap with its own answer rather than the whole comma-joined
    // construction — mirroring grammar_oral_meaning's fillFor below.
    const gapCount = countGaps(sentence, card.content.gapMarker)
    const constructionParts = splitGapAnswers(construction)
    const fillFor = (gapIndex: number) =>
      constructionParts.length === gapCount
        ? (constructionParts[gapIndex] ?? construction)
        : construction
    const segments = constructionReadingSegments(card.content) ?? []
    const kanjiSegments = segments.filter((s) => s.reading?.trim())
    const usesPerSegmentInputs = kanjiSegments.length > 1

    if (column === "question") {
      const hasHidden =
        card.content.translationEn.trim().length > 0 ||
        card.content.images.length > 0
      return (
        <div className="stack prompt-extras-anchor">
          <div className="prompt-extras-row">
            <p className="prompt-main grammar-gap-sentence">
              <RubySentence
                sentence={sentence}
                gapMarker={card.content.gapMarker}
                readings={card.content.readings}
                renderGap={(gapIndex) => (
                  <span className="construction-fill">{fillFor(gapIndex)}</span>
                )}
              />
            </p>
            {hasHidden && renderExtrasToggle("Show meaning & images")}
          </div>
          {hasHidden &&
            renderExtrasContent(
              <>
                {card.content.translationEn.trim() && (
                  <p>{card.content.translationEn}</p>
                )}
                <CardImageRow images={card.content.images} />
              </>,
            )}
        </div>
      )
    }

    if (revealed) return null

    function segInputValue(i: number) {
      return usesPerSegmentInputs
        ? typedGapValues(typed, kanjiSegments.length)[i] ?? ""
        : typed
    }
    function onSegInputChange(i: number, value: string) {
      if (!usesPerSegmentInputs) {
        onTypedChange(value)
        return
      }
      const parts = typedGapValues(typed, kanjiSegments.length)
      parts[i] = value
      onTypedChange(parts.join(GAP_ANSWER_JOIN))
    }

    return (
      <div className="stack">
        <div className="answer-input-anchor">
          {usesPerSegmentInputs ? (
            <div className="phrase-reading-inputs">
              {kanjiSegments.map((seg, i) => (
                <label key={i} className="phrase-reading-input">
                  <span className="input-label-text">{seg.text}（ひらがなで）</span>
                  <TypingAnswerInput
                    value={segInputValue(i)}
                    onChange={(value) => onSegInputChange(i, value)}
                    onSubmit={onTypedSubmit}
                    focusKey={focusKey}
                    autoComplete="off"
                    autoFocus={i === 0}
                    ariaLabel={`Reading for ${seg.text}`}
                  />
                </label>
              ))}
            </div>
          ) : (
            <label>
              <span className="input-label-text">ひらがなで</span>
              <TypingAnswerInput
                value={typed}
                onChange={onTypedChange}
                onSubmit={onTypedSubmit}
                focusKey={focusKey}
                autoComplete="off"
              />
            </label>
          )}
          {readingWarn && (
            <p className="error">
              読み方には、ひらがなのみを使用してください。
            </p>
          )}
          {nWarn && (
            <p className="error">
              「ん」が抜けているようです。母音の前や「や/ゆ/よ」の前では、「nn」と入力してみてください。
            </p>
          )}
        </div>
      </div>
    )
  }

  if (m === "grammar_oral_meaning" && card.kind === "grammar") {
    if (column === "answer") return null
    const sentence = card.content.sentenceWithGap
    const construction = card.content.construction

    // Fill the gap(s) with the construction so the whole sentence is asked,
    // with the construction highlighted. When the construction has as many
    // comma-separated answers (using either "," or "、") as there are gaps,
    // map one answer per gap.
    const gapCount = countGaps(sentence, card.content.gapMarker)
    const parts = splitGapAnswers(construction)
    const fillFor = (gapIndex: number) =>
      parts.length === gapCount ? parts[gapIndex] ?? construction : construction

    return (
      <div className="stack">
        <p className="prompt-main grammar-gap-sentence">
          <RubySentence
            sentence={sentence}
            gapMarker={card.content.gapMarker}
            readings={card.content.readings}
            renderGap={(gapIndex) => {
              const fill = fillFor(gapIndex)
              return (
                <span className="construction-fill">
                  <RubyWord
                    surface={fill}
                    reading={readingForConstruction(
                      fill,
                      card.content.readings,
                    )}
                  />
                </span>
              )
            }}
          />
        </p>
      </div>
    )
  }

  if (column === "answer") return null
  return (
    <p className="muted small">
      Unsupported review mode for this card type.
    </p>
  )
}

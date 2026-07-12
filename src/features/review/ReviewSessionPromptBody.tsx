import { useEffect, useRef } from "react"
import type { DueItem } from "../../services/review"
import { RubySegment, RubySentence, RubyWord } from "../../ui/KanjiRuby"
import { CardImageRow } from "../../ui/CardImageRow"
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

type TypingAnswerInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  focusKey: string
  autoComplete?: string
  className?: string
  ariaLabel?: string
  autoFocus?: boolean
}

function isTouchPrimaryDevice() {
  if (typeof window.matchMedia !== "function") return false
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches
}

function TypingAnswerInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  focusKey,
  autoComplete,
  className,
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
  synonymWarn: boolean
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
}

export function ReviewSessionPromptBody({
  item,
  typed,
  onTypedChange,
  readingWarn,
  synonymWarn,
  onTypedSubmit,
  revealed = false,
  column,
}: ReviewSessionPromptBodyProps) {
  const { card, modeId: m } = item
  const focusKey = `${card.id}:${m}`

  // Asking for the English meaning: show the Japanese word + example sentences.
  // Kanji readings stay available on hover/focus via <RubyWord>. No typing
  // input for this mode — it's answered aloud.
  if (m === "vocab_oral_en" && card.kind === "vocabulary") {
    if (column === "answer") return null
    const examples = card.content.exampleSentences.filter((s) => s.trim())
    const exampleReadings = vocabExampleReadings(card.content)
    return (
      <div className="stack">
        <p className="prompt-main">
          {card.content.reading?.trim() ? (
            // The `reading` field is authoritative for the headline word —
            // don't let a same-keyed map entry (e.g. authored only to
            // stylize furigana inside an example sentence) override it.
            <RubyWord surface={card.content.wordJa} reading={card.content.reading} />
          ) : (
            <RubySegment segment={card.content.wordJa} readings={card.content.readings ?? {}} />
          )}
        </p>
        {examples.map((s, i) => (
          <p key={i} className="muted">
            <RubySentence sentence={s} gapMarker="" readings={exampleReadings} />
          </p>
        ))}
      </div>
    )
  }

  // Asking for the Japanese reading: show only the kanji. Everything that could
  // give the reading away (images, meanings, examples) hides behind an expander.
  if (m === "vocab_type_reading" && card.kind === "vocabulary") {
    // A phrase word (e.g. 結論に至る) has no whole-word `reading`; its per-kanji
    // segments (結論/至る) live in the same phrase map instead, and are exactly
    // this mode's answer — so, like the whole-word fallback below, they must
    // not leak through the "hidden" example-sentence furigana before reveal.
    const wordSegments = card.content.reading?.trim()
      ? []
      : (phraseReadingSegments(card.content) ?? [])
    const kanjiSegments = wordSegments.filter((s) => s.reading?.trim())
    const usesPerSegmentInputs = kanjiSegments.length > 1

    if (column === "question") {
      const definitions = card.content.definitionsEn.filter((s) => s.trim())
      const examples = card.content.exampleSentences.filter((s) => s.trim())
      const quizzedKeys = new Set(kanjiSegments.map((s) => s.text))
      const exampleReadings = Object.fromEntries(
        Object.entries(card.content.readings ?? {}).filter(
          ([k]) => !quizzedKeys.has(k),
        ),
      )
      const hasHidden =
        definitions.length > 0 ||
        examples.length > 0 ||
        card.content.images.length > 0
      return (
        <div className="stack">
          <p className="prompt-main">{card.content.wordJa}</p>
          {hasHidden && (
            <details className="prompt-extras">
              <summary className="btn">Show meaning, examples & images</summary>
              <div className="prompt-extras-content stack">
                {definitions.length > 0 && (
                  <ul>
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
              </div>
            </details>
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
        {usesPerSegmentInputs ? (
          <div className="phrase-reading-inputs">
            {kanjiSegments.map((seg, i) => (
              <label key={i} className="phrase-reading-input">
                {seg.text}
                <TypingAnswerInput
                  value={segInputValue(i)}
                  onChange={(value) => onSegInputChange(i, value)}
                  onSubmit={onTypedSubmit}
                  placeholder="ひらがなで"
                  focusKey={focusKey}
                  autoComplete="off"
                  autoFocus={i === 0}
                  ariaLabel={`Reading for ${seg.text}`}
                />
              </label>
            ))}
          </div>
        ) : (
          <TypingAnswerInput
            value={typed}
            onChange={onTypedChange}
            onSubmit={onTypedSubmit}
            placeholder="ひらがなで"
            focusKey={focusKey}
            autoComplete="off"
          />
        )}
        {readingWarn && (
          <p className="error">
            Use hiragana only for readings (no kanji or katakana).
          </p>
        )}
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
      <div className="stack">
        <label>
          Type the Japanese word
          <TypingAnswerInput
            value={typed}
            onChange={onTypedChange}
            onSubmit={onTypedSubmit}
            placeholder="Japanese word"
            focusKey={focusKey}
          />
        </label>
        {synonymWarn && (
          <p className="warn">
            That matches a synonym — try the main form on the card.
          </p>
        )}
      </div>
    )
  }

  if (m === "grammar_type_construction" && card.kind === "grammar") {
    const gapMarker = card.content.gapMarker.trim()
    const hasInlineGap =
      Boolean(gapMarker) && card.content.sentenceWithGap.includes(gapMarker)

    if (column === "question") {
      const gapCount = hasInlineGap
        ? countGaps(card.content.sentenceWithGap, gapMarker)
        : 0
      // Only split into one input per gap when the construction already has a
      // matching number of comma-separated answers — otherwise fall back to a
      // single shared input at every gap (e.g. while the card is still being
      // authored, or for the common single-gap case).
      const usesPerGapInputs =
        gapCount > 1 &&
        splitGapAnswers(card.content.construction).length === gapCount

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

      return (
        <div className="stack">
          <div className="grammar-gap-sentence">
            <RubySentence
              sentence={card.content.sentenceWithGap}
              gapMarker={card.content.gapMarker}
              readings={card.content.readings}
              renderGap={
                !revealed && hasInlineGap
                  ? (gapIndex) => (
                      <TypingAnswerInput
                        value={gapInputValue(gapIndex)}
                        onChange={(value) => onGapInputChange(gapIndex, value)}
                        onSubmit={onTypedSubmit}
                        placeholder={
                          usesPerGapInputs
                            ? `Answer ${gapIndex + 1}`
                            : "Construction"
                        }
                        focusKey={focusKey}
                        className="inline-gap-input"
                        ariaLabel={`Construction gap ${gapIndex + 1}`}
                        autoFocus={gapIndex === 0}
                      />
                    )
                  : revealed
                    ? (gapIndex) => (
                        <span className="gap-filled">
                          {gapInputValue(gapIndex) || "—"}
                        </span>
                      )
                    : undefined
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

    // column === "answer": only the rare fallback where the construction has
    // no inline gap gets a standalone input here — an inline gap's input
    // lives in the question sentence itself. The synonym warning still
    // belongs here regardless, since it's about what was typed either way.
    if (revealed) return null
    return (
      <div className="stack">
        {!hasInlineGap && (
          <TypingAnswerInput
            value={typed}
            onChange={onTypedChange}
            onSubmit={onTypedSubmit}
            placeholder="Construction"
            focusKey={focusKey}
          />
        )}
        {synonymWarn && (
          <p className="warn">
            That matches a synonym — try the construction written on the card.
          </p>
        )}
      </div>
    )
  }

  // Asking for the reading of the construction: the gap is filled with the
  // plain kanji (no ruby — that would give away the answer), and the
  // meaning/images hide behind an expander like the vocab reading quiz.
  if (m === "grammar_type_reading" && card.kind === "grammar") {
    const gapMarker = card.content.gapMarker.trim()
    const sentence = card.content.sentenceWithGap
    const construction = card.content.construction
    const hasInlineGap = Boolean(gapMarker) && sentence.includes(gapMarker)
    // For a multi-gap sentence with one comma-separated answer per gap, fill
    // each gap with its own answer rather than the whole comma-joined
    // construction — mirroring grammar_oral_meaning's fillFor below.
    const gapCount = hasInlineGap ? countGaps(sentence, gapMarker) : 0
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
        <div className="stack">
          <p className="prompt-main grammar-gap-sentence">
            {hasInlineGap ? (
              <RubySentence
                sentence={sentence}
                gapMarker={card.content.gapMarker}
                readings={card.content.readings}
                renderGap={(gapIndex) => (
                  <span className="construction-fill">{fillFor(gapIndex)}</span>
                )}
              />
            ) : (
              construction
            )}
          </p>
          {hasHidden && (
            <details className="prompt-extras">
              <summary className="btn">Show meaning & images</summary>
              <div className="prompt-extras-content stack">
                {card.content.translationEn.trim() && (
                  <p>{card.content.translationEn}</p>
                )}
                <CardImageRow images={card.content.images} />
              </div>
            </details>
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
        {usesPerSegmentInputs ? (
          <div className="phrase-reading-inputs">
            {kanjiSegments.map((seg, i) => (
              <label key={i} className="phrase-reading-input">
                {seg.text}
                <TypingAnswerInput
                  value={segInputValue(i)}
                  onChange={(value) => onSegInputChange(i, value)}
                  onSubmit={onTypedSubmit}
                  placeholder="ひらがなで"
                  focusKey={focusKey}
                  autoComplete="off"
                  autoFocus={i === 0}
                  ariaLabel={`Reading for ${seg.text}`}
                />
              </label>
            ))}
          </div>
        ) : (
          <TypingAnswerInput
            value={typed}
            onChange={onTypedChange}
            onSubmit={onTypedSubmit}
            placeholder="ひらがなで"
            focusKey={focusKey}
            autoComplete="off"
          />
        )}
        {readingWarn && (
          <p className="error">
            Use hiragana only for readings (no kanji or katakana).
          </p>
        )}
      </div>
    )
  }

  if (m === "grammar_oral_meaning" && card.kind === "grammar") {
    if (column === "answer") return null
    const gapMarker = card.content.gapMarker.trim()
    const sentence = card.content.sentenceWithGap
    const construction = card.content.construction
    const hasInlineGap = Boolean(gapMarker) && sentence.includes(gapMarker)

    if (hasInlineGap) {
      // Fill the gap(s) with the construction so the whole sentence is asked,
      // with the construction highlighted. When the construction has as many
      // comma-separated answers (using either "," or "、") as there are gaps,
      // map one answer per gap.
      const gapCount = countGaps(sentence, gapMarker)
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

    return (
      <div className="stack">
        <p className="prompt-main">
          <RubyWord
            surface={construction}
            reading={readingForConstruction(
              construction,
              card.content.readings,
            )}
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

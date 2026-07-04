import { useEffect, useRef } from "react"
import type { DueItem } from "../../services/review"
import { RubySentence, RubyWord } from "../../ui/KanjiRuby"
import { CardImageRow } from "../../ui/CardImageRow"
import { clueExampleSentences, readingForConstruction } from "./reviewFlowHelpers"
import {
  countGaps,
  splitGapAnswers,
  typedGapValues,
} from "../../domain/grammarGaps"

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
}

export function ReviewSessionPromptBody({
  item,
  typed,
  onTypedChange,
  readingWarn,
  synonymWarn,
  onTypedSubmit,
  revealed = false,
}: ReviewSessionPromptBodyProps) {
  const { card, modeId: m } = item
  const focusKey = `${card.id}:${m}`

  // Asking for the English meaning: show the Japanese word + example sentences.
  // Kanji readings stay available on hover/focus via <RubyWord>.
  if (m === "vocab_oral_en" && card.kind === "vocabulary") {
    const examples = card.content.exampleSentences.filter((s) => s.trim())
    return (
      <div className="stack">
        <p className="prompt-main">
          <RubyWord surface={card.content.wordJa} reading={card.content.reading} />
        </p>
        {examples.map((s, i) => (
          <p key={i} className="muted">
            {s}
          </p>
        ))}
      </div>
    )
  }

  // Asking for the Japanese reading: show only the kanji. Everything that could
  // give the reading away (images, meanings, examples) hides behind an expander.
  if (m === "vocab_type_reading" && card.kind === "vocabulary") {
    const definitions = card.content.definitionsEn.filter((s) => s.trim())
    const examples = card.content.exampleSentences.filter((s) => s.trim())
    const hasHidden =
      definitions.length > 0 ||
      examples.length > 0 ||
      card.content.images.length > 0
    return (
      <div className="stack">
        <p className="prompt-main">
          {revealed ? (
            <RubyWord
              surface={card.content.wordJa}
              reading={card.content.reading}
            />
          ) : (
            card.content.wordJa
          )}
        </p>
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
                  {s}
                </p>
              ))}
              <CardImageRow images={card.content.images} />
            </div>
          </details>
        )}
        {!revealed && (
          <>
            <TypingAnswerInput
              value={typed}
              onChange={onTypedChange}
              onSubmit={onTypedSubmit}
              placeholder="ひらがなで"
              focusKey={focusKey}
              autoComplete="off"
            />
            {readingWarn && (
              <p className="error">
                Use hiragana only for readings (no kanji or katakana).
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  // Asking for the Japanese word: show the English meaning, plus any example
  // sentences that keep the answer blanked out, plus images (sized to fit).
  if (m === "vocab_type_word_from_clue" && card.kind === "vocabulary") {
    const examples = clueExampleSentences(card.content)
    return (
      <div className="stack">
        <ul>
          {card.content.definitionsEn
            .filter((s) => s.trim())
            .map((d, i) => (
              <li key={i}>{d}</li>
            ))}
        </ul>
        {examples.map((s, i) => (
          <p key={i} className="muted">
            {s}
          </p>
        ))}
        <CardImageRow images={card.content.images} />
        {!revealed && (
          <>
            <TypingAnswerInput
              value={typed}
              onChange={onTypedChange}
              onSubmit={onTypedSubmit}
              placeholder="Japanese word"
              focusKey={focusKey}
            />
            {synonymWarn && (
              <p className="warn">
                That matches a synonym — try the main form on the card.
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  if (m === "grammar_type_construction" && card.kind === "grammar") {
    const gapMarker = card.content.gapMarker.trim()
    const hasInlineGap =
      Boolean(gapMarker) && card.content.sentenceWithGap.includes(gapMarker)
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
      onTypedChange(parts.join(", "))
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
        {!revealed && (
          <>
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
          </>
        )}
      </div>
    )
  }

  if (m === "grammar_oral_meaning" && card.kind === "grammar") {
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

  return (
    <p className="muted small">
      Unsupported review mode for this card type.
    </p>
  )
}

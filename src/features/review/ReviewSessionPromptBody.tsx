import { useEffect, useRef } from "react"
import type { DueItem } from "../../services/review"
import { RubySentence, RubyWord } from "../../ui/KanjiRuby"
import { CardImage } from "../../ui/CardImage"
import { readingForConstruction } from "./reviewFlowHelpers"

type TypingAnswerInputProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  focusKey: string
  autoComplete?: string
}

function TypingAnswerInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  focusKey,
  autoComplete,
}: TypingAnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [focusKey])

  return (
    <input
      ref={inputRef}
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return
        e.preventDefault()
        onSubmit()
      }}
      placeholder={placeholder}
      autoComplete={autoComplete}
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
}

export function ReviewSessionPromptBody({
  item,
  typed,
  onTypedChange,
  readingWarn,
  synonymWarn,
  onTypedSubmit,
}: ReviewSessionPromptBodyProps) {
  const { card, modeId: m } = item
  const focusKey = `${card.id}:${m}`

  if (m === "vocab_oral_en" && card.kind === "vocabulary") {
    return (
      <div className="stack">
        <p className="prompt-main">
          <RubyWord surface={card.content.wordJa} reading={card.content.reading} />
        </p>
        {card.content.exampleSentences[0] && (
          <p className="muted">{card.content.exampleSentences[0]}</p>
        )}
        {card.content.images.map((id) => (
          <CardImage key={id} mediaId={id} />
        ))}
      </div>
    )
  }

  if (m === "vocab_type_reading" && card.kind === "vocabulary") {
    return (
      <div className="stack">
        <p className="prompt-main">{card.content.wordJa}</p>
        {card.content.images.map((id) => (
          <CardImage key={id} mediaId={id} />
        ))}
        {card.content.exampleSentences[0] && (
          <p className="muted">{card.content.exampleSentences[0]}</p>
        )}
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
      </div>
    )
  }

  if (m === "vocab_type_word_from_clue" && card.kind === "vocabulary") {
    return (
      <div className="stack">
        <ul>
          {card.content.definitionsEn
            .filter((s) => s.trim())
            .map((d, i) => (
              <li key={i}>{d}</li>
            ))}
        </ul>
        {card.content.images.map((id) => (
          <CardImage key={id} mediaId={id} />
        ))}
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
      </div>
    )
  }

  if (m === "grammar_type_construction" && card.kind === "grammar") {
    return (
      <div className="stack">
        <RubySentence
          sentence={card.content.sentenceWithGap}
          gapMarker={card.content.gapMarker}
          readings={card.content.readings}
        />
        {card.content.translationEn.trim() && (
          <p className="muted">{card.content.translationEn}</p>
        )}
        {card.content.images.map((id) => (
          <CardImage key={id} mediaId={id} />
        ))}
        <TypingAnswerInput
          value={typed}
          onChange={onTypedChange}
          onSubmit={onTypedSubmit}
          placeholder="Construction"
          focusKey={focusKey}
        />
        {synonymWarn && (
          <p className="warn">
            That matches a synonym — try the construction written on the card.
          </p>
        )}
      </div>
    )
  }

  if (m === "grammar_oral_meaning" && card.kind === "grammar") {
    return (
      <div className="stack">
        <p className="prompt-main">
          <RubyWord
            surface={card.content.construction}
            reading={readingForConstruction(
              card.content.construction,
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

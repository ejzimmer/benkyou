import { useEffect, useId, useRef, type ReactNode } from "react"
import { PlusIcon } from "../../ui/PlusIcon"
import { CloseIcon } from "../../ui/CloseIcon"

type Props = {
  /** The field's label text (日本語で / 答え). */
  label: string
  /** Renders the card's main answer input (the first row), given the id the
   * label points at. */
  renderPrimaryInput: (id: string) => ReactNode
  /** Shown right under the main input, above any extra answers — the main
   * answer's own error/warning messages, so they stay next to the field they
   * refer to. */
  primaryMessages?: ReactNode
  /** Other spellings also accepted as correct (`alternateAnswers`). */
  alternates: string[]
  onAlternatesChange: (alternates: string[]) => void
}

/**
 * A card's answer field plus any number of extra accepted answers, one input
 * each, stacked under it. The + button always sits at the end of the last
 * input and adds another below it; each extra input's × removes it.
 */
export function AnswerInputs({
  label,
  renderPrimaryInput,
  primaryMessages,
  alternates,
  onAlternatesChange,
}: Props) {
  const primaryId = useId()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  /** Input to focus once a row has been added or removed: an alternate's
   * index, or -1 for the main input. */
  const focusIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const i = focusIndexRef.current
    if (i == null) return
    focusIndexRef.current = null
    const target =
      i < 0 ? document.getElementById(primaryId) : inputRefs.current[i]
    target?.focus()
  }, [alternates.length, primaryId])

  function add() {
    focusIndexRef.current = alternates.length
    onAlternatesChange([...alternates, ""])
  }

  function remove(index: number) {
    // The × that was clicked goes away with its row — move focus to the input
    // above it rather than dropping it on the page.
    focusIndexRef.current = index - 1
    onAlternatesChange(alternates.filter((_, i) => i !== index))
  }

  const addButton = (
    <button
      type="button"
      className="answer-icon-btn"
      aria-label="答えを追加"
      onClick={add}
    >
      <PlusIcon className="answer-icon" />
    </button>
  )

  return (
    <div className="answer-inputs">
      <label htmlFor={primaryId}>{label}</label>
      <div className="answer-input-row">
        {renderPrimaryInput(primaryId)}
        {alternates.length === 0 && addButton}
      </div>
      {primaryMessages}
      {alternates.map((value, i) => (
        <div key={i} className="answer-input-row">
          <input
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            className="input"
            aria-label={`${label}（${i + 2}）`}
            value={value}
            onChange={(e) =>
              onAlternatesChange(
                alternates.map((a, j) => (j === i ? e.target.value : a)),
              )
            }
          />
          <button
            type="button"
            className="answer-icon-btn"
            aria-label={`${label}（${i + 2}）を削除`}
            onClick={() => remove(i)}
          >
            <CloseIcon className="answer-icon" />
          </button>
          {i === alternates.length - 1 && addButton}
        </div>
      ))}
    </div>
  )
}

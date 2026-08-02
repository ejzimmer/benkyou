import { useEffect, useRef } from "react"
import type { DueItem } from "../../services/review"
import { AnswerComparison } from "../../ui/AnswerComparison"
import { CardImageRow } from "../../ui/CardImageRow"
import { fullyCoveredSegments } from "../../domain/readingsMap"
import { useScrollShadow } from "../../ui/useScrollShadow"
import { ReviewFooter } from "./ReviewFooter"
import {
  answersMatch,
  differsOnlyByPunctuation,
  displayedCorrectAnswer,
  readingForConstruction,
  requiresTyping,
} from "./reviewFlowHelpers"
import { countGaps } from "../../domain/grammarGaps"
import {
  containsKanji,
  phraseReadingSegments,
  wordJaReading,
} from "../../domain/vocabularyContent"
import { constructionReadingSegments } from "../../domain/grammarContent"

export type ReviewSessionAnswerPanelProps = {
  item: DueItem
  typed: string
  expected: string
  pendingIncorrectDelay: boolean
  onJudge: (correct: boolean) => void
  onUndoAnswer: () => void
  /**
   * Whether "Show answer" lives on the question side for this mode (oral
   * modes, or a construction gap typed inline in the question sentence —
   * see `showAnswerOnQuestionSide`). On the stacked mobile layout these
   * modes flip the question card over to reveal this panel, so it needs
   * its own way back even when there's no typed answer to retry.
   */
  showFlipBack?: boolean
  /**
   * Whether the answer is actually revealed right now. The panel stays
   * mounted (opacity-hidden + inert) even while still on the prompt side, so
   * this must gate the focus effect below — otherwise it'd steal focus onto
   * the (hidden) Correct/Incorrect buttons on every keystroke in the typing
   * input, since `typed` changes on each one. Defaults to true so a panel
   * rendered on its own (as in tests) keeps its original focus-on-mount
   * behaviour.
   */
  active?: boolean
}

export function ReviewSessionAnswerPanel({
  item,
  typed,
  expected,
  pendingIncorrectDelay,
  onJudge,
  onUndoAnswer,
  showFlipBack = false,
  active = true,
}: ReviewSessionAnswerPanelProps) {
  const { card, modeId: m } = item
  const typingMode = requiresTyping(m)
  const answerContentRef = useScrollShadow<HTMLDivElement>()
  const correctBtnRef = useRef<HTMLButtonElement>(null)
  const incorrectBtnRef = useRef<HTMLButtonElement>(null)
  const answeredCorrectly = answersMatch(m, typed, expected)
  // When `expected` lists "/"-separated alternates, show just the one the
  // learner actually matched — the raw "A/B" isn't itself an answer anyone
  // typed, and a reading/furigana meant for one alternate would otherwise be
  // shown stacked over both.
  const displayExpected = displayedCorrectAnswer(m, typed, expected)
  const wordFromClueReading =
    m === "vocab_type_word_from_clue" && card.kind === "vocabulary"
      ? wordJaReading(card.content)
      : undefined
  const wordFromClueShowRuby =
    Boolean(wordFromClueReading?.trim()) && containsKanji(displayExpected)
  const wordFromClueSegments =
    wordFromClueShowRuby && card.kind === "vocabulary"
      ? fullyCoveredSegments(displayExpected, card.content.readings ?? {})
      : undefined
  // When the card structurally has multiple answer parts (a multi-gap
  // construction, or a phrase word/construction reading quizzed segment by
  // segment), the comma between them is meaningful content (a part
  // boundary), not decorative punctuation — stripping it could make a
  // wrong, merged answer (e.g. "猫犬" vs "猫, 犬") look like a
  // punctuation-only typo. Only fall back to the fuzzy check otherwise, so a
  // single-part answer that happens to contain a literal comma/、 (e.g. a
  // one-gap construction like "はい、そうです") isn't mistaken for multi-part.
  const isMultiPartAnswer =
    (m === "grammar_type_construction" &&
      card.kind === "grammar" &&
      countGaps(card.content.sentenceWithGap, card.content.gapMarker) > 1) ||
    (m === "vocab_type_reading" &&
      card.kind === "vocabulary" &&
      Boolean(phraseReadingSegments(card.content))) ||
    (m === "grammar_type_reading" &&
      card.kind === "grammar" &&
      (constructionReadingSegments(card.content)?.filter((s) =>
        s.reading?.trim(),
      ).length ?? 0) > 1)

  useEffect(() => {
    if (!active || pendingIncorrectDelay) return
    // Typed answers default focus to Correct when right (or only punctuation is
    // off); otherwise Incorrect. Oral answers always default to Correct.
    const focusCorrect =
      !typingMode ||
      answeredCorrectly ||
      (!isMultiPartAnswer && differsOnlyByPunctuation(typed, expected))
    if (focusCorrect) {
      correctBtnRef.current?.focus({ preventScroll: true })
    } else {
      incorrectBtnRef.current?.focus({ preventScroll: true })
    }
  }, [
    active,
    typingMode,
    answeredCorrectly,
    isMultiPartAnswer,
    pendingIncorrectDelay,
    typed,
    expected,
  ])

  const answerControls = (
    <ReviewFooter>
      <button
        ref={correctBtnRef}
        type="button"
        className="btn good"
        aria-label="正解"
        disabled={pendingIncorrectDelay}
        onClick={() => onJudge(true)}
      >
        <span className="maru-mark" aria-hidden="true" />
      </button>
      <button
        ref={incorrectBtnRef}
        type="button"
        className="btn bad"
        aria-label="不正解"
        disabled={pendingIncorrectDelay}
        onClick={() => onJudge(false)}
      >
        <span className="cross-mark" aria-hidden="true" />
      </button>
      {(typingMode || showFlipBack) && (
        <button
          type="button"
          className="btn secondary"
          aria-label="やり直す"
          disabled={pendingIncorrectDelay}
          onClick={() => onUndoAnswer()}
        >
          やり直す
        </button>
      )}
    </ReviewFooter>
  )

  return (
    <div className="answer-block stack">
      <div className="answer-content stack" ref={answerContentRef}>
        {m === "vocab_oral_en" && card.kind === "vocabulary" && (
          <div className="oral-answer">
            {card.content.definitionsEn
              .filter((s) => s.trim())
              .map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            <CardImageRow images={card.content.images} />
          </div>
        )}

        {m === "vocab_type_reading" && card.kind === "vocabulary" && (
          <AnswerComparison
            typed={typed}
            expected={displayExpected}
            answeredCorrectly={answeredCorrectly}
          />
        )}

        {m === "vocab_type_word_from_clue" && card.kind === "vocabulary" && (
          <div className="word-from-clue-result">
            {answeredCorrectly ? (
              <div
                className="word-from-clue-correct"
                role="group"
                aria-label="答え"
              >
                {wordFromClueShowRuby ? (
                  <span
                    className="ruby-hover word-from-clue-word"
                    lang="ja"
                    tabIndex={0}
                  >
                    {wordFromClueSegments ? (
                      wordFromClueSegments.map((s, i) =>
                        s.reading?.trim() ? (
                          <ruby key={i}>
                            {s.text}
                            <rt>{s.reading}</rt>
                          </ruby>
                        ) : (
                          <span key={i}>{s.text}</span>
                        ),
                      )
                    ) : (
                      <ruby>
                        {displayExpected}
                        <rt>{wordFromClueReading}</rt>
                      </ruby>
                    )}
                  </span>
                ) : (
                  <span className="word-from-clue-word" lang="ja">
                    {displayExpected}
                  </span>
                )}
                <span className="maru-mark" aria-hidden="true" />
                <span className="sr-only">正解</span>
              </div>
            ) : (
              <AnswerComparison
                typed={typed}
                expected={displayExpected}
                reading={wordFromClueReading}
                readings={card.content.readings}
                answeredCorrectly={answeredCorrectly}
              />
            )}
          </div>
        )}

        {m === "grammar_type_construction" && card.kind === "grammar" && (
          <AnswerComparison
            typed={typed}
            expected={displayExpected}
            reading={readingForConstruction(
              card.content.construction,
              card.content.readings,
            )}
            readings={card.content.readings}
            answeredCorrectly={answeredCorrectly}
          />
        )}

        {m === "grammar_type_reading" && card.kind === "grammar" && (
          <AnswerComparison
            typed={typed}
            expected={displayExpected}
            answeredCorrectly={answeredCorrectly}
          />
        )}

        {m === "grammar_oral_meaning" && card.kind === "grammar" && (
          <div className="oral-answer">
            {card.content.translationEn.trim() && (
              <p>{card.content.translationEn}</p>
            )}
            <CardImageRow images={card.content.images} />
          </div>
        )}
      </div>

      {answerControls}
    </div>
  )
}

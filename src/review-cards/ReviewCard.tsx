import { useCallback, useEffect, useMemo, useState } from "react"
import { CardType } from "../types"
import { TickIcon } from "../common/TickIcon"
import { IconButton } from "../common/IconButton"
import { CrossIcon } from "../common/CrossIcon"

type Props = {
  card: CardType
  onCorrect: () => void
  onIncorrect: () => void
}

export function ReviewCard({ card, onCorrect, onIncorrect }: Props) {
  const [isFuriganaVisible, setFuriganaVisible] = useState(false)
  const [isAnswerVisible, setAnswerVisible] = useState(false)
  const [areExamplesVisible, setExamplesVisible] = useState(false)
  const [areResponseButtonsVisible, setResponseButtonsVisible] = useState(false)

  const characters = useMemo(
    () =>
      card.japanese.kana.split("").map((kana, index) => ({
        kana,
        furigana: card.japanese.furigana?.[index],
      })),
    [card]
  )

  const toggleFurigana = useCallback(() => {
    setFuriganaVisible(!isFuriganaVisible)
    setResponseButtonsVisible(true)
  }, [isFuriganaVisible])
  const toggleAnswer = useCallback(() => {
    setAnswerVisible(!isAnswerVisible)
    setResponseButtonsVisible(true)
  }, [isAnswerVisible])
  const toggleExamples = useCallback(() => {
    setExamplesVisible(!areExamplesVisible)
  }, [areExamplesVisible])

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (!areResponseButtonsVisible) {
          setFuriganaVisible(true)
          setAnswerVisible(true)
          setResponseButtonsVisible(true)
        } else {
          onCorrect()
        }
      }

      if (event.key === "x" && areResponseButtonsVisible) {
        onIncorrect()
      }
    }
    window.addEventListener("keydown", keyHandler)
    return () => window.removeEventListener("keydown", keyHandler)
  })

  return (
    <div>
      <div className="japanese">
        {characters.map(({ furigana, kana }, index) => (
          <div key={index} className="kana">
            <div className={getClassName("furigana", isFuriganaVisible)}>
              {furigana}
            </div>
            <div className="kana">{kana}</div>
          </div>
        ))}
      </div>
      <div className={getClassName("answer", isAnswerVisible)}>
        {card.english}
      </div>
      {card.exampleSentences && (
        <ul className={getClassName("examples", areExamplesVisible)}>
          {card.exampleSentences.map((example, index) => (
            <li key={index}>{example}</li>
          ))}
        </ul>
      )}
      <div className="toggles">
        <button onClick={toggleFurigana}>ふりがな</button>
        <button onClick={toggleAnswer}>回答</button>
        <button onClick={toggleExamples}>使用例</button>
      </div>
      <div className={getClassName("controls", areResponseButtonsVisible)}>
        <IconButton
          label="correct"
          onClick={onCorrect}
          icon={TickIcon}
          className="correct"
        />
        <IconButton label="incorrect" onClick={onIncorrect} icon={CrossIcon} />
      </div>
    </div>
  )
}

function getClassName(base: string, isVisible: boolean) {
  return `${base} ${isVisible ? "visible" : ""}`
}

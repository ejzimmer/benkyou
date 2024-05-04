import { useMemo, useState } from "react"
import { CardType } from "../types"

type Props = {
  card: CardType
}

export function ReviewCard({ card }: Props) {
  const [isFuriganaVisible, setFuriganaVisible] = useState(false)
  const [isAnswerVisible, setAnswerVisible] = useState(false)
  const [areExamplesVisible, setExamplesVisible] = useState(false)

  const characters = useMemo(
    () =>
      card.japanese.kana.split("").map((kana, index) => ({
        kana,
        furigana: card.japanese.furigana[index],
      })),
    [card]
  )

  return (
    <div className="review-card">
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
      <div className="toggles">
        <button onClick={() => setFuriganaVisible(!isFuriganaVisible)}>
          ふりがな
        </button>
        <button onClick={() => setAnswerVisible(!isAnswerVisible)}>回答</button>
        <button onClick={() => setExamplesVisible(!areExamplesVisible)}>
          使用例
        </button>
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
    </div>
  )
}

function getClassName(base: string, isVisible: boolean) {
  return `${base} ${isVisible ? "visible" : ""}`
}

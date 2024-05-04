import { useCallback, useId, useState } from "react"
import { Word } from "../types"

type Props = {
  value: Word
  onChange: (value: Word) => void
}

export function JapaneseInput({ value, onChange }: Props) {
  const [isFuriganaVisible, setFuriganaVisible] = useState(false)

  const addFurigana = useCallback(
    (index: number, kana: string) => {
      value.furigana[index] = kana
      onChange({ ...value, furigana: [...value.furigana] })
    },
    [value, onChange]
  )

  return (
    <label htmlFor="japanese" className="jp">
      日本語
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr max-content",
          gap: "3px",
        }}
      >
        <input
          id="japanese"
          className="jp"
          lang="jp"
          value={value.kana}
          onChange={(event) => onChange({ ...value, kana: event.target.value })}
        />
        <button
          type="button"
          onClick={() => setFuriganaVisible(!isFuriganaVisible)}
        >
          + ふりがな
        </button>
        {isFuriganaVisible && value.kana.length > 0 && (
          <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
            {value.kana.split("").map((kana, index) => (
              <FuriganaInput
                key={index}
                value={value.furigana[index]}
                kanji={kana}
                onChange={(furigana) => addFurigana(index, furigana)}
              />
            ))}
          </div>
        )}
      </div>
    </label>
  )
}

type FuriganaInputProps = {
  kanji: string
  value?: string
  onChange: (furigana: string) => void
}
function FuriganaInput({ kanji, value, onChange }: FuriganaInputProps) {
  const id = useId()

  return (
    <div className="furigana-input">
      <label htmlFor={id}>{kanji}</label>
      <input
        id={id}
        size={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

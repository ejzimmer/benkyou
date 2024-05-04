import { FormEvent, useCallback, useState } from "react"
import { JapaneseInput } from "./JapaneseInput"
import "./create-card.css"
import { Word } from "./types"
import { ExampleSentences } from "./ExampleSentences"

export function CreateCard() {
  const [japanese, setJapanese] = useState<Word>({ kana: "", furigana: [] })
  const [english, setEnglish] = useState<string>("")
  const [exampleSentences, setExampleSentences] = useState<string[]>([])

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      console.log(japanese)
      console.log(english)
      console.log(exampleSentences)
    },
    [japanese, english, exampleSentences]
  )

  return (
    <form className="create-card" onSubmit={onSubmit}>
      <JapaneseInput value={japanese} onChange={setJapanese} />

      <label htmlFor="english" className="en">
        英語
        <input
          id="english"
          className="en"
          value={english}
          onChange={(event) => setEnglish(event.target.value)}
        />
      </label>

      <ExampleSentences
        value={exampleSentences}
        onChange={setExampleSentences}
      />

      <div className="footer-buttons">
        <button type="reset" style={{ opacity: ".8" }}>
          <svg viewBox="0 0 10 10" strokeWidth="1" stroke="currentColor">
            <line x1="2" y1="2" x2="8" y2="8" />
            <line x1="8" y1="2" x2="2" y2="8" />
          </svg>
        </button>
        <button>
          <svg
            viewBox="0 0 10 10"
            strokeWidth="1"
            stroke="currentColor"
            fill="none"
          >
            <path d="M1,6 L4,8 8,2" />
          </svg>
        </button>
      </div>
    </form>
  )
}

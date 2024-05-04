import { FormEvent, useCallback, useState } from "react"
import { JapaneseInput } from "./JapaneseInput"
import "./create-card.css"
import { Word } from "./types"
import { ExampleSentences } from "./ExampleSentences"
import { CrossIcon } from "../common/CrossIcon"
import { TickIcon } from "../common/TickIcon"
import { IconButton } from "../common/IconButton"

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
        <IconButton icon={CrossIcon} label="Cancel" />
        <IconButton icon={TickIcon} label="Create card" />
      </div>
    </form>
  )
}
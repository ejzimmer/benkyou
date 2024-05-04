import { FormEvent, useCallback, useEffect, useState } from "react"
import { JapaneseInput } from "./JapaneseInput"
import "./edit-card.css"
import { Word } from "../types"
import { ExampleSentences } from "./ExampleSentences"
import { CrossIcon } from "../common/CrossIcon"
import { TickIcon } from "../common/TickIcon"
import { IconButton } from "../common/IconButton"
import { useNavigate, useParams } from "react-router-dom"
import { useDatabase } from "../common/DatabaseContext"
import { child, onValue, push, ref, update } from "firebase/database"
import { IconLink } from "../common/IconLink"

type Params = { deckId: string; cardId?: string }

export function Card() {
  const { deckId, cardId } = useParams<Params>()
  const [japanese, setJapanese] = useState<Word>({ kana: "", furigana: [] })
  const [english, setEnglish] = useState<string>("")
  const [exampleSentences, setExampleSentences] = useState<string[]>([])
  const database = useDatabase()
  const navigate = useNavigate()

  useEffect(() => {
    if (!database) {
      console.error("Missing database")
      return
    }

    if (!cardId) return

    const cardRef = ref(database, `decks/${deckId}/cards/${cardId}`)
    onValue(cardRef, (snapshot) => {
      const card = snapshot.val()
      if (card) {
        setJapanese(card.japanese)
        setEnglish(card.english)
        setExampleSentences(card.exampleSentences ?? [])
      }
    })
  }, [database, deckId, cardId])

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (!database) {
        console.error("missing database")
        return
      }

      if (!japanese.kana) return

      const key =
        cardId ?? push(child(ref(database), `decks/${deckId}/cards`)).key
      const card = {
        [`/decks/${deckId}/cards/${key}`]: {
          japanese,
          english,
          exampleSentences,
        },
      }
      await update(ref(database), card)

      // We're in edit mode, go back to the card list
      if (cardId) {
        return navigate(`/edit/${deckId}`)
      }

      // We're in add mode, just hang out here
      setJapanese({ kana: "", furigana: [] })
      setEnglish("")
      setExampleSentences([])
    },
    [japanese, english, exampleSentences, database, deckId, navigate, cardId]
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
        <IconLink to={`/edit/${deckId}`} label="cancel" icon={CrossIcon} />
        <IconButton type="submit" icon={TickIcon} label="Create card" />
      </div>
    </form>
  )
}

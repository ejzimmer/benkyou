import { useCallback, useEffect, useState } from "react"
import "./deck-list.css"
import { CreateDeck } from "./CreateDeck"
import { useDatabase } from "../common/DatabaseContext"
import { onValue, ref, remove } from "firebase/database"
import { Deck } from "./Deck"

type DeckType = {
  id: string
  name: string
  cards: unknown[]
}

export function DeckList() {
  const [isLoading, setLoading] = useState(true)
  const [decks, setDecks] = useState<DeckType[]>()
  const database = useDatabase()

  useEffect(() => {
    if (!database) {
      console.error("Missing database")
      return
    }

    const decksRef = ref(database, "decks")
    onValue(decksRef, (snapshot) => {
      const data = snapshot.val()
      const decks = (Object.entries(data) as [string, DeckType][]).map(
        ([key, value]) => ({
          ...value,
          id: key,
        })
      )
      setDecks(decks)
      setLoading(false)
    })
  }, [database])

  const handleDelete = useCallback(
    (id: string) => {
      if (!database) {
        console.error("Missing database")
        return
      }

      const deleteRef = ref(database, `decks/${id}`)
      remove(deleteRef)
    },
    [database]
  )

  return (
    <div className="deck-list">
      {isLoading ? (
        <>Fetching decks...</>
      ) : decks ? (
        <>
          <ul>
            {decks.map(({ name, id }) => (
              <li key={id}>
                <Deck
                  name={name}
                  onStudy={function (): void {
                    throw new Error("Function not implemented.")
                  }}
                  onEdit={function (): void {
                    throw new Error("Function not implemented.")
                  }}
                  onDelete={() => handleDelete(id)}
                />
              </li>
            ))}
          </ul>
          <CreateDeck />
        </>
      ) : (
        <NoDecks />
      )}
    </div>
  )
}

function NoDecks() {
  const [showDeckForm, setShowDeckForm] = useState(false)

  return (
    <div className="no-decks">
      {showDeckForm ? (
        <CreateDeck onClose={() => setShowDeckForm(false)} />
      ) : (
        <button className="add-deck" onClick={() => setShowDeckForm(true)}>
          + デック
        </button>
      )}
    </div>
  )
}

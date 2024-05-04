import { push, child, ref, update } from "firebase/database"
import { CrossButton } from "../common/CrossButton"
import { useRef, useCallback, FormEvent, useState } from "react"
import { useDatabase } from "../common/DatabaseContext"
import { TickButton } from "../common/TickButton"

type Props = {
  onClose: () => void
}

export function DeckNameInput({ onClose }: Props) {
  const database = useDatabase()
  const nameRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  const addDeck = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (!database) {
        console.error("missing database")
        return
      }

      const name = nameRef.current?.value
      if (!name) {
        return
      }

      const newDeckKey = push(child(ref(database), "decks")).key
      const updates = {
        [`/decks/${newDeckKey}`]: { name, cards: [] },
      }
      setIsLoading(true)
      await update(ref(database), updates)
      setIsLoading(false)
      onClose()
    },
    [database, onClose]
  )

  return isLoading ? (
    <>Adding...</>
  ) : (
    <form onSubmit={addDeck} className="deck-name-input">
      <input ref={nameRef} />
      <CrossButton onClick={onClose} />
      <TickButton />
    </form>
  )
}

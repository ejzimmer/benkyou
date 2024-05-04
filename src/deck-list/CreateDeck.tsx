import { push, child, ref, update } from "firebase/database"
import { useRef, useCallback, FormEvent, useState } from "react"
import { useDatabase } from "../common/DatabaseContext"
import { CrossIcon } from "../common/CrossIcon"
import { IconButton } from "../common/IconButton"
import { TickIcon } from "../common/TickIcon"
import { PlusIcon } from "../common/PlusIcon"

type Props = {
  onClose?: () => void
}

export function CreateDeck({ onClose }: Props) {
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
      onClose?.()
    },
    [database, onClose]
  )

  return isLoading ? (
    <>Adding...</>
  ) : (
    <form onSubmit={addDeck} className="deck-name-input">
      <input ref={nameRef} />
      {onClose ? (
        <>
          <IconButton icon={CrossIcon} onClick={onClose} label="cancel" />
          <IconButton icon={TickIcon} label="create deck" />
        </>
      ) : (
        <IconButton icon={PlusIcon} label="create deck" />
      )}
    </form>
  )
}

import { useState } from "react"
import "./deck-list.css"
import { DeckNameInput } from "./DeckNameInput"

export function DeckList() {
  const [showNameInput, setShowNameInput] = useState(false)

  return (
    <div className="deck-list">
      {showNameInput ? (
        <DeckNameInput onClose={() => setShowNameInput(false)} />
      ) : (
        <button className="add-deck" onClick={() => setShowNameInput(true)}>
          + デック
        </button>
      )}
    </div>
  )
}

import React, { useRef } from "react"
import "./App.css"
import { DeckList } from "./deck-list/DeckList"
import { getDatabase } from "firebase/database"
import { DatabaseContext } from "./common/DatabaseContext"

function App() {
  const database = useRef(getDatabase())

  return (
    <DatabaseContext.Provider value={{ database: database.current }}>
      <DeckList />
    </DatabaseContext.Provider>
  )
}

export default App

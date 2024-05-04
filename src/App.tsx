import React, { useRef } from "react"
import "./App.css"
import { DeckList } from "./deck-list/DeckList"
import { getDatabase } from "firebase/database"
import { DatabaseContext } from "./common/DatabaseContext"
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import { EditDeck } from "./edit-deck/EditDeck"
import { Card } from "./edit-card/EditCard"
import { ReviewCards } from "./review-cards/ReviewCards"

function App() {
  const database = useRef(getDatabase())

  return (
    <DatabaseContext.Provider value={{ database: database.current }}>
      <Router>
        <Routes>
          <Route path="/edit/:deckId" Component={EditDeck} />
          <Route path="/:deckId/add" Component={Card} />
          <Route path="/:deckId/edit/:cardId" Component={Card} />
          <Route path="/:deckId/review" Component={ReviewCards} />
          <Route path="/" Component={DeckList} />
        </Routes>
      </Router>
    </DatabaseContext.Provider>
  )
}

export default App

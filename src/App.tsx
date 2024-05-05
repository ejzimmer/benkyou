import React, { useEffect, useState } from "react"
import "./App.css"
import { DeckList } from "./deck-list/DeckList"
import { getDatabase } from "firebase/database"
import { FirebaseContext } from "./common/FirebaseContext"
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import { EditDeck } from "./edit-deck/EditDeck"
import { Card } from "./edit-card/EditCard"
import { ReviewCards } from "./review-cards/ReviewCards"

import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithRedirect,
} from "firebase/auth"

function App() {
  const [database] = useState(getDatabase)
  const [authProvider] = useState(() => new GoogleAuthProvider())
  const [auth] = useState(getAuth)
  const [user, setUser] = useState<User | null>()

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setUser(user)
    })
  }, [auth, authProvider])

  return (
    <FirebaseContext.Provider value={{ database }}>
      {user === null ? (
        <button
          className="login centred"
          onClick={() => signInWithRedirect(auth, authProvider)}
        >
          log in
        </button>
      ) : !user ? (
        <div className="centred">loading...</div>
      ) : (
        <>
          <Router>
            <Routes>
              <Route path="/edit/:deckId" Component={EditDeck} />
              <Route path="/:deckId/add" Component={Card} />
              <Route path="/:deckId/edit/:cardId" Component={Card} />
              <Route path="/:deckId/review" Component={ReviewCards} />
              <Route path="/" Component={DeckList} />
            </Routes>
          </Router>
        </>
      )}
    </FirebaseContext.Provider>
  )
}

export default App

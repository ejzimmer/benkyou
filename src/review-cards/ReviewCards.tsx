import { ref, onValue } from "firebase/database"
import { useEffect, useState } from "react"
import { useDatabase } from "../common/DatabaseContext"
import { useNavigate, useParams } from "react-router-dom"
import { CardType } from "../types"

import "./review-cards.css"
import { ReviewCard } from "./ReviewCard"

type Params = { deckId: string; cardId: string }

export function ReviewCards() {
  const [cards, setCards] = useState<CardType[]>([])
  const [currentCard, setCurrentCard] = useState(0)
  const database = useDatabase()
  const { deckId, cardId } = useParams<Params>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!database) {
      console.error("Missing database")
      return
    }

    const cardRef = ref(database, `decks/${deckId}/cards`)
    onValue(cardRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) navigate(`/${deckId}/add`)

      const cards = Object.entries(value as Record<string, CardType>).map(
        ([id, value]) => ({ ...value, id })
      )
      setCards(cards)
    })
  }, [database, deckId, cardId, navigate])

  return cards[currentCard] && <ReviewCard card={cards[currentCard]} />
}

import { ref, onValue, update } from "firebase/database"
import { useCallback, useEffect, useState } from "react"
import { useDatabase } from "../common/DatabaseContext"
import { useNavigate, useParams } from "react-router-dom"
import { CardType } from "../types"

import "./review-cards.css"
import { ReviewCard } from "./ReviewCard"
import { isSameDay } from "date-fns/isSameDay"
import { addDays } from "date-fns/addDays"
import { LeftArrowIcon } from "../common/LeftArrowIcon"
import { IconLink } from "../common/IconLink"

type Params = { deckId: string }

export function ReviewCards() {
  const database = useDatabase()
  const { deckId } = useParams<Params>()
  const navigate = useNavigate()
  const [todaysCards, setTodaysCards] = useState<CardType[]>([])

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
      setTodaysCards(getTodaysCards(cards))
    })
  }, [database, deckId, navigate])

  const markCardCorrect = useCallback(async () => {
    if (!database) {
      console.error("missing database")
      return
    }

    const [currentCard] = todaysCards
    const updatedCard = updateCard(currentCard)
    const updates = {
      [`/decks/${deckId}/cards/${currentCard.id}`]: updatedCard,
    }
    await update(ref(database), updates)
  }, [todaysCards, deckId, database])

  const markCardIncorrect = useCallback(() => {
    const [currentCard, ...remainingCards] = todaysCards
    currentCard.level = 0
    setTodaysCards([...remainingCards, currentCard])
  }, [todaysCards])

  return todaysCards[0] ? (
    <ReviewCard
      card={todaysCards[0]}
      onCorrect={markCardCorrect}
      onIncorrect={markCardIncorrect}
    />
  ) : (
    <div className="review-card">
      <IconLink
        className="back-link"
        label="return to deck list"
        to="/"
        icon={LeftArrowIcon}
      />
      <div>No more cards!</div>
    </div>
  )
}

const getTodaysCards = (cards: CardType[]) =>
  cards.filter((card) => !card.dueDate || isSameDay(card.dueDate, new Date()))

function updateCard(card: CardType) {
  const level = (card.level ?? 0) + 1
  const nextInterval = Math.pow(2, level)
  const dueDate = addDays(new Date(), nextInterval)
  return { ...card, level, dueDate }
}

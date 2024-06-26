import { ref, update, get } from "firebase/database"
import { useCallback, useEffect, useState } from "react"
import { useDatabase } from "../common/FirebaseContext"
import { useNavigate, useParams } from "react-router-dom"
import { CardType } from "../types"

import "./review-cards.css"
import { ReviewCard } from "./ReviewCard"
import { addDays } from "date-fns/addDays"
import { LeftArrowIcon } from "../common/LeftArrowIcon"
import { IconLink } from "../common/IconLink"
import { endOfDay, isBefore } from "date-fns"

type Params = { deckId: string }

export function ReviewCards() {
  const database = useDatabase()
  const { deckId } = useParams<Params>()
  const navigate = useNavigate()
  const [todaysCards, setTodaysCards] = useState<CardType[]>([])
  const [sessionTotal, setSessionTotal] = useState(0)

  useEffect(() => {
    const cardRef = ref(database, `decks/${deckId}/cards`)
    get(cardRef).then((snapshot) => {
      const value = snapshot.val()
      if (!value) navigate(`/${deckId}/add`)

      const cards = Object.entries(value as Record<string, CardType>).map(
        ([id, value]) => ({ ...value, id })
      )
      const todaysCards = getTodaysCards(cards)
      setTodaysCards(todaysCards)
      setSessionTotal(todaysCards.length)
    })
  }, [database, deckId, navigate])

  const markCardCorrect = useCallback(async () => {
    if (!database) {
      console.error("missing database")
      return
    }

    const [currentCard, ...remainingCards] = todaysCards
    const updatedCard = updateCard(currentCard)
    const updates = {
      [`/decks/${deckId}/cards/${currentCard.id}`]: updatedCard,
    }
    await update(ref(database), updates)
    setTodaysCards(remainingCards)
  }, [todaysCards, deckId, database])

  const markCardIncorrect = useCallback(() => {
    const [currentCard, ...remainingCards] = todaysCards
    currentCard.level = 0
    setTodaysCards([...remainingCards, currentCard])
  }, [todaysCards])

  return todaysCards[0] ? (
    <div className="review-card">
      <ReviewCard
        key={todaysCards[0].japanese.kana}
        card={todaysCards[0]}
        onCorrect={markCardCorrect}
        onIncorrect={markCardIncorrect}
      />
      <div className="session-count">
        {sessionTotal - todaysCards.length}/{sessionTotal} cards completed
      </div>
      <IconLink
        className="back-link"
        label="return to deck list"
        to="/"
        icon={LeftArrowIcon}
      />
    </div>
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
  cards.filter(
    (card: CardType) =>
      !card.dueDate || isBefore(card.dueDate, endOfDay(new Date()))
  )

function updateCard(card: CardType) {
  const level = card.level ?? 0
  const nextInterval = Math.pow(2, level)
  const dueDate = addDays(new Date(), nextInterval)
  return { ...card, level: level + 1, dueDate }
}

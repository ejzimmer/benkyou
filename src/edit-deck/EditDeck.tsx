import { Link, useNavigate, useParams } from "react-router-dom"
import { useDatabase } from "../common/FirebaseContext"
import { useCallback, useEffect, useState } from "react"
import { onValue, ref, remove } from "firebase/database"
import { CardType } from "../types"
import { CardSummary } from "./CardSummary"

import "./edit-deck.css"
import { LeftArrowIcon } from "../common/LeftArrowIcon"
import { IconLink } from "../common/IconLink"

type Params = { deckId: string }

export function EditDeck() {
  const { deckId } = useParams<Params>()
  const database = useDatabase()
  const [cards, setCards] = useState<CardType[]>()
  const navigate = useNavigate()

  useEffect(() => {
    const deckRef = ref(database, `decks/${deckId}`)
    onValue(deckRef, (snapshot) => {
      const data = snapshot.val().cards

      if (!data) {
        setCards(data)
        return
      }

      const cards = (Object.entries(data) as [string, CardType][]).map(
        ([key, value]) => ({
          ...value,
          id: key,
        })
      )
      setCards(cards)
    })
  }, [database, deckId, navigate])

  const handleDelete = useCallback(
    (id: string) => {
      const deleteRef = ref(database, `decks/${deckId}/cards/${id}`)
      return remove(deleteRef)
    },
    [database, deckId]
  )

  return (
    <div className="card-list">
      {cards?.length ? (
        <>
          <table>
            <tbody>
              {cards.map(({ id, japanese, english }) => (
                <CardSummary
                  key={id}
                  id={id}
                  word={japanese.kana}
                  translation={english}
                  onDelete={() => handleDelete(id)}
                  deckId={deckId!}
                />
              ))}
            </tbody>
          </table>
          <div className="footer-links">
            <IconLink
              to="/"
              label="back to deck list"
              icon={LeftArrowIcon}
              className="back-arrow"
            />
            <Link to={`/${deckId}/add`}>+ カード </Link>
          </div>
        </>
      ) : (
        <div className="no-cards">
          <Link to={`/${deckId}/add`}>+ カード </Link>
          <IconLink to="/" icon={LeftArrowIcon} label="back to deck list" />
        </div>
      )}
    </div>
  )
}

import type { Card } from "../../domain/types"
import { duplicateCardLabel } from "../../domain/duplicates"
import { ExternalLinkIcon } from "../../ui/ExternalLinkIcon"

export type DuplicateJapaneseMatch = { card: Card; deckName: string }

export function DuplicateJapaneseWarning({
  matches,
}: {
  matches: DuplicateJapaneseMatch[]
}) {
  if (matches.length === 0) return null
  return (
    <div className="warn small duplicate-japanese-warning" role="status">
      <p>この単語を含むカードが、既に出席しています。</p>
      <ul>
        {matches.map(({ card, deckName }) => {
          const { word, meaning } = duplicateCardLabel(card)
          return (
            <li key={card.id}>
              <a
                href={`/decks/${card.deckId}/cards/${card.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {word} - {meaning}
                <ExternalLinkIcon className="external-link-icon" />
              </a>
              {" は、"}
              <a
                href={`/decks/${card.deckId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {deckName}
                <ExternalLinkIcon className="external-link-icon" />
              </a>
              {" にあります。"}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

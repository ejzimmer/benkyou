import { CrossIcon } from "../common/CrossIcon"
import { IconButton } from "../common/IconButton"
import { PencilIcon } from "../common/PencilIcon"
import { useCallback, useRef, useState } from "react"
import { DeleteConfirmation } from "../common/DeleteConfirmation"
import { IconLink } from "../common/IconLink"

type Props = {
  deckId: string
  id: string
  word: string
  translation: string
  onDelete: () => void
}

export function CardSummary({
  deckId,
  id,
  word,
  translation,
  onDelete,
}: Props) {
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const [isShowingDeleteConfirmation, setShowingDeleteConfirmation] =
    useState(false)

  const showConfirmation = useCallback(
    () => setShowingDeleteConfirmation(true),
    []
  )
  const hideConfirmation = useCallback(
    () => setShowingDeleteConfirmation(false),
    []
  )
  const deleteCard = useCallback(async () => {
    await onDelete()
    hideConfirmation()
  }, [hideConfirmation, onDelete])

  return (
    <tr>
      <td style={{ paddingRight: "20px" }}>{word}</td>
      <td style={{ width: "100%" }}>{translation}</td>
      <td style={{ width: "80px", paddingRight: 0 }}>
        <IconButton
          icon={CrossIcon}
          onClick={showConfirmation}
          className="ghost"
          label={`delete ${word}`}
          ref={deleteButtonRef}
        />
        {isShowingDeleteConfirmation && (
          <DeleteConfirmation
            returnFocusRef={deleteButtonRef}
            name={word}
            onConfirm={deleteCard}
            onClose={hideConfirmation}
          />
        )}
        <IconLink
          label={`edit ${word}`}
          to={`/${deckId}/edit/${id}`}
          icon={PencilIcon}
          className="edit"
        />
      </td>
    </tr>
  )
}
